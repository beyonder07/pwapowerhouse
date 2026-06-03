-- 1. Alter public.payments to support tracking month, source, created_by, and approved_by
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS month varchar(7);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS created_by text;

-- Populate existing payments to allow NOT NULL constraint on month
UPDATE public.payments SET month = to_char(created_at, 'YYYY-MM') WHERE month IS NULL;
ALTER TABLE public.payments ALTER COLUMN month SET NOT NULL;

-- Add check constraints on payments table
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_source_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_source_check CHECK (source IS NULL OR source IN ('trainer', 'member', 'owner'));

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_created_by_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_created_by_check CHECK (created_by IS NULL OR created_by IN ('trainer', 'member'));

-- 2. Create payment_requests table
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  trainer_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  month varchar(7) NOT NULL CHECK (month ~ '^\d{4}-\d{2}$'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_by text NOT NULL CHECK (created_by IN ('trainer', 'member')),
  payment_mode text NOT NULL CHECK (payment_mode IN ('cash', 'upi', 'card', 'bank-transfer', 'other')),
  notes text,
  screenshot_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Add Unique Constraints to prevent duplicates/race conditions (CRITICAL)
CREATE UNIQUE INDEX IF NOT EXISTS unique_member_month_request
ON public.payment_requests (member_id, month)
WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS unique_member_month_payment
ON public.payments (user_id, month)
WHERE status IN ('approved', 'paid', 'pending') AND created_at >= '2026-06-03 00:00:00+00';

-- 4. Add Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_payment_requests_member ON public.payment_requests(member_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON public.payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id);

-- 5. Enable RLS on payment_requests
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

-- 6. Add RLS Policies with relation check (Trainer-Member Assignment verification)
DROP POLICY IF EXISTS payment_requests_owner_all ON public.payment_requests;
CREATE POLICY payment_requests_owner_all ON public.payment_requests
  FOR ALL TO authenticated
  USING (public.current_app_role() = 'owner')
  WITH CHECK (public.current_app_role() = 'owner');

DROP POLICY IF EXISTS payment_requests_trainer_read ON public.payment_requests;
CREATE POLICY payment_requests_trainer_read ON public.payment_requests
  FOR SELECT TO authenticated
  USING (
    public.current_app_role() = 'trainer'
    AND (
      trainer_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.users trainer
        JOIN public.users member ON trainer.gym_id = member.gym_id
        WHERE trainer.id = auth.uid()
          AND member.id = member_id
      )
    )
  );

DROP POLICY IF EXISTS payment_requests_trainer_insert ON public.payment_requests;
CREATE POLICY payment_requests_trainer_insert ON public.payment_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_app_role() = 'trainer'
    AND trainer_id = auth.uid()
    AND created_by = 'trainer'
    AND EXISTS (
      SELECT 1 FROM public.users trainer
      JOIN public.users member ON trainer.gym_id = member.gym_id
      WHERE trainer.id = auth.uid()
        AND member.id = member_id
    )
  );

DROP POLICY IF EXISTS payment_requests_client_read ON public.payment_requests;
CREATE POLICY payment_requests_client_read ON public.payment_requests
  FOR SELECT TO authenticated
  USING (public.current_app_role() = 'client' AND member_id = auth.uid());

-- 7. Database Function for Atomic Transactions (Approve/Reject)
CREATE OR REPLACE FUNCTION public.review_trainer_payment_request(
  p_request_id uuid,
  p_status text,
  p_owner_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
declare
  v_request public.payment_requests%rowtype;
  v_gym_id uuid;
  v_membership public.memberships%rowtype;
  v_base_end date;
  v_new_end date;
  v_plan_duration_days integer;
  v_payment_id bigint;
begin
  -- 1. Fetch and lock request
  SELECT * INTO v_request
  FROM public.payment_requests
  WHERE id = p_request_id AND status = 'pending'
  FOR UPDATE;

  if not found then
    raise exception 'Pending payment request not found';
  end if;

  -- 2. Fetch member gym assignment
  SELECT gym_id INTO v_gym_id
  FROM public.users
  WHERE id = v_request.member_id;

  -- 3. Perform Status Review
  UPDATE public.payment_requests
  SET status = p_status, updated_at = now()
  WHERE id = p_request_id;

  if p_status = 'approved' then
    -- Check if payment already exists for this member + month (double check in db transaction)
    if exists (
      SELECT 1 FROM public.payments
      WHERE user_id = v_request.member_id AND month = v_request.month
    ) then
      raise exception 'Payment already exists for this month';
    end if;

    -- Calculate days in the request month
    v_plan_duration_days := date_part('day', (v_request.month || '-01')::date + interval '1 month' - interval '1 day')::integer;

    -- Insert approved payment
    INSERT INTO public.payments (
      user_id,
      gym_id,
      amount,
      payment_mode,
      status,
      plan_duration,
      approved_at,
      approved_by,
      screenshot_url,
      month,
      source,
      created_by
    )
    VALUES (
      v_request.member_id,
      v_gym_id,
      v_request.amount,
      v_request.payment_mode,
      'approved',
      v_plan_duration_days,
      now(),
      p_owner_id,
      v_request.screenshot_url,
      v_request.month,
      v_request.created_by,
      v_request.created_by
    )
    RETURNING id INTO v_payment_id;

    -- Update or create membership
    SELECT * INTO v_membership
    FROM public.memberships
    WHERE user_id = v_request.member_id
      AND gym_id = v_gym_id
      AND status = 'active'
    ORDER BY end_date DESC
    LIMIT 1
    FOR UPDATE;

    if found then
      -- Extended: max(current_end, today) + duration
      v_base_end := greatest(v_membership.end_date, current_date);
      v_new_end := v_base_end + v_plan_duration_days;

      UPDATE public.memberships
      SET
        end_date = v_new_end,
        updated_at = now()
      WHERE id = v_membership.id;
    else
      -- First time membership
      INSERT INTO public.memberships (
        user_id,
        gym_id,
        start_date,
        end_date,
        status
      )
      VALUES (
        v_request.member_id,
        v_gym_id,
        current_date,
        current_date + v_plan_duration_days - 1,
        'active'
      );
    end if;
  end if;

  return jsonb_build_object(
    'success', true,
    'requestId', p_request_id,
    'status', p_status
  );
end;
$$;

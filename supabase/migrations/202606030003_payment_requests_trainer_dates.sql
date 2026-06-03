-- Add custom trainer dates to payment_requests table
ALTER TABLE public.payment_requests ADD COLUMN IF NOT EXISTS plan_start_date date;
ALTER TABLE public.payment_requests ADD COLUMN IF NOT EXISTS plan_end_date date;
ALTER TABLE public.payment_requests ADD COLUMN IF NOT EXISTS payment_date date;

-- Update the review_trainer_payment_request function to respect trainer custom dates
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
  v_payment_id uuid;
  v_payment_date timestamptz;
  v_start_date date;
  v_end_date date;
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

    -- Determine dates
    if v_request.plan_start_date is not null and v_request.plan_end_date is not null then
      v_start_date := v_request.plan_start_date;
      v_end_date := v_request.plan_end_date;
      v_plan_duration_days := (v_end_date - v_start_date) + 1;
    else
      -- Fallback to default month calculation
      v_start_date := current_date;
      v_plan_duration_days := date_part('day', (v_request.month || '-01')::date + interval '1 month' - interval '1 day')::integer;
      v_end_date := v_start_date + v_plan_duration_days - 1;
    end if;

    if v_request.payment_date is not null then
      v_payment_date := (v_request.payment_date || ' 12:00:00')::timestamptz;
    else
      v_payment_date := now();
    end if;

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
      created_by,
      created_at
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
      v_request.created_by,
      v_payment_date
    )
    RETURNING id INTO v_payment_id;

    -- Update or create membership using the custom dates
    SELECT * INTO v_membership
    FROM public.memberships
    WHERE user_id = v_request.member_id
      AND gym_id = v_gym_id
      AND status = 'active'
    ORDER BY end_date DESC
    LIMIT 1
    FOR UPDATE;

    if v_request.plan_start_date is not null and v_request.plan_end_date is not null then
      -- Use custom dates directly
      if found then
        UPDATE public.memberships
        SET
          start_date = v_start_date,
          end_date = v_end_date,
          updated_at = now()
        WHERE id = v_membership.id;
      else
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
          v_start_date,
          v_end_date,
          'active'
        );
      end if;
    else
      -- Fallback to incremental update
      if found then
        v_base_end := greatest(v_membership.end_date, current_date);
        v_new_end := v_base_end + v_plan_duration_days;

        UPDATE public.memberships
        SET
          end_date = v_new_end,
          updated_at = now()
        WHERE id = v_membership.id;
      else
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
  end if;

  return jsonb_build_object(
    'success', true,
    'requestId', p_request_id,
    'status', p_status
  );
end;
$$;

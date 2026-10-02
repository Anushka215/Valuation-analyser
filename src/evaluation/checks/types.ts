export type CheckStatus = "PASS" | "FAIL" | "NEEDS_REVIEW";

export interface CheckOutcome {
  status: CheckStatus;
  message: string;
}

export interface CheckArgs<TParams> {
  value: unknown;
  params: TParams;
  data: Record<string, unknown>;
}

export type CheckFn<TParams> = (args: CheckArgs<TParams>) => CheckOutcome;

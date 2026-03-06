import { xeroClient } from "../clients/xero-client.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { getClientHeaders } from "../helpers/get-client-headers.js";
import { ReportWithRow } from "xero-node";

/**
 * Internal function to fetch bank summary report from Xero.
 * The Bank Summary report shows opening balance, cash received,
 * cash spent, and closing balance for each bank and credit card account.
 */
async function fetchBankSummary(
  fromDate?: string,
  toDate?: string,
): Promise<ReportWithRow | null> {
  await xeroClient.authenticate();

  const response = await xeroClient.accountingApi.getReportBankSummary(
    xeroClient.tenantId,
    fromDate,
    toDate,
    getClientHeaders(),
  );

  return response.body.reports?.[0] ?? null;
}

/**
 * List bank summary report from Xero.
 * Shows opening balance, cash received, cash spent, and closing balance
 * for all bank and credit card accounts.
 * @param fromDate Optional start date in YYYY-MM-DD format
 * @param toDate Optional end date in YYYY-MM-DD format
 */
export async function listXeroBankSummary(
  fromDate?: string,
  toDate?: string,
): Promise<XeroClientResponse<ReportWithRow>> {
  try {
    const bankSummary = await fetchBankSummary(fromDate, toDate);

    if (!bankSummary) {
      return {
        result: null,
        isError: true,
        error: "Failed to fetch bank summary report from Xero.",
      };
    }

    return {
      result: bankSummary,
      isError: false,
      error: null,
    };
  } catch (error) {
    return {
      result: null,
      isError: true,
      error: formatError(error),
    };
  }
}

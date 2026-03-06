import { z } from "zod";
import { listXeroBankSummary } from "../../handlers/list-xero-bank-summary.handler.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
const ListBankSummaryTool = CreateXeroTool("list-bank-summary", `List the Bank Summary report from Xero.
  This shows opening balance, cash received, cash spent, and closing balance
  for all bank and credit card accounts over a specified period.
  Useful for daily cash position checks and reconciliation workflows.`, {
    fromDate: z
        .string()
        .optional()
        .describe("Optional start date in YYYY-MM-DD format"),
    toDate: z
        .string()
        .optional()
        .describe("Optional end date in YYYY-MM-DD format"),
}, async (args) => {
    const response = await listXeroBankSummary(args?.fromDate, args?.toDate);
    if (response.error !== null) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error listing bank summary report: ${response.error}`,
                },
            ],
        };
    }
    const bankSummaryReport = response.result;
    return {
        content: [
            {
                type: "text",
                text: `Bank Summary Report: ${bankSummaryReport?.reportName ?? "Unnamed"}`,
            },
            {
                type: "text",
                text: `Date Range: ${bankSummaryReport?.reportDate ?? "Not specified"}`,
            },
            {
                type: "text",
                text: `Updated At: ${bankSummaryReport?.updatedDateUTC ? bankSummaryReport.updatedDateUTC.toISOString() : "Unknown"}`,
            },
            {
                type: "text",
                text: JSON.stringify(bankSummaryReport.rows, null, 2),
            },
        ],
    };
});
export default ListBankSummaryTool;

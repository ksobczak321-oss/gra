-- Read-only query for an EXISTING standard Cloud Billing export.
-- Replace BILLING_PROJECT.BILLING_DATASET; this query creates no export/resource.
-- Required named TIMESTAMP parameter: window_end.
-- Reports the provider's rows whose usage_start_time falls in [end-24h, end).
WITH usage_rows AS (
  SELECT project.id AS project_id,
         service.description AS service,
         currency,
         IFNULL(cost, 0) AS gross_cost,
         IFNULL((SELECT SUM(credit.amount) FROM UNNEST(credits) AS credit), 0) AS credit_amount
  FROM `BILLING_PROJECT.BILLING_DATASET.gcp_billing_export_v1_010F11_5A6F09_27543C`
  WHERE billing_account_id = '010F11-5A6F09-27543C'
    AND project.id IN ('harborlight-dev', 'harborlight-prod')
    AND usage_start_time >= TIMESTAMP_SUB(@window_end, INTERVAL 24 HOUR)
    AND usage_start_time < @window_end
)
SELECT currency,
       CASE WHEN GROUPING(project_id) = 1 THEN 'TOTAL' ELSE project_id END AS project_id,
       CASE WHEN GROUPING(service) = 1 THEN 'ALL_SERVICES' ELSE service END AS service,
       SUM(gross_cost) AS gross_cost,
       SUM(credit_amount) AS credits,
       SUM(gross_cost + credit_amount) AS net_cost
FROM usage_rows
GROUP BY GROUPING SETS ((currency, project_id, service), (currency, project_id), (currency))
ORDER BY currency, GROUPING(project_id), project_id, GROUPING(service), service;

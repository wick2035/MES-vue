-- 物料需求计划：净需求改为始终等于毛需求
-- 背景：原净需求 = 毛需求 + 安全库存 − 可用库存（下限 0），库存充足时会算成 0；
--       业务上每条物料需求都应按毛需求全额计划，库存扣减交由后续「配套出库」环节处理。
-- 本脚本修复存量数据，使净需求与毛需求一致；可重复执行（仅更新不一致行）。

UPDATE sp_material_requirement_plan
SET net_requirement = gross_requirement
WHERE is_deleted <> '1'
  AND gross_requirement IS NOT NULL
  AND (net_requirement IS NULL OR net_requirement <> gross_requirement);

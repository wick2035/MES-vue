-- 库存状态规范化：旧数据可能使用空值、0、正常、可用，统一为仓储中心标准 AVAILABLE。
-- 可重复执行。

SET @sp_inventory_stock_status_missing := (
  SELECT COUNT(*) = 0
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'sp_inventory'
    AND COLUMN_NAME = 'stock_status'
);

SET @sp_inventory_stock_status_sql := IF(
  @sp_inventory_stock_status_missing,
  'ALTER TABLE `sp_inventory` ADD COLUMN `stock_status` varchar(32) NOT NULL DEFAULT ''AVAILABLE'' AFTER `unit`',
  'SELECT 1'
);

PREPARE stmt FROM @sp_inventory_stock_status_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `sp_inventory`
SET `stock_status` = 'AVAILABLE'
WHERE `stock_status` IS NULL
   OR `stock_status` = ''
   OR `stock_status` IN ('0', '正常', '可用');

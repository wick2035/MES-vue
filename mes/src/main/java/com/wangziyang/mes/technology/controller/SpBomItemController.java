package com.wangziyang.mes.technology.controller;


import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.technology.entity.SpBomItem;
import com.wangziyang.mes.technology.service.ISpBomItemService;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.List;

/**
 * <p>
 *  BOM子项前端控制器
 * </p>
 *
 * @author WangZiYang
 * @since 2020-03-28
 */
@Controller
@RequestMapping("/technology/sp-bom-item")
public class SpBomItemController extends BaseController {

    @Autowired
    private ISpBomItemService iSpBomItemService;

    /**
     * 根据BOM头ID查询子项列表（供addOrUpdate页面加载已有子项）
     */
    @GetMapping("/list-by-bom")
    @ResponseBody
    public Result listByBom(String bomHeadId) {
        List<SpBomItem> items = iSpBomItemService.list(
                new QueryWrapper<SpBomItem>()
                        .eq("bom_head_id", bomHeadId)
                        .last("ORDER BY CAST(line_no AS UNSIGNED)")
        );
        return Result.success(items);
    }

    /**
     * BOM 子项新增 / 修改
     */
    @PostMapping("/add-or-update")
    @ResponseBody
    public Result addOrUpdate(SpBomItem record) {
        if (StringUtils.isEmpty(record.getBomHeadId())) {
            return Result.failure("缺少所属 BOM 信息");
        }
        if (StringUtils.isEmpty(record.getMaterielItemCode())) {
            return Result.failure("子项物料编码不能为空");
        }
        if (record.getItemNum() == null) {
            return Result.failure("用量不能为空");
        }
        iSpBomItemService.saveOrUpdate(record);
        return Result.success(record.getId());
    }

    /**
     * BOM 子项删除
     */
    @PostMapping("/delete")
    @ResponseBody
    public Result delete(@RequestParam String id) {
        iSpBomItemService.removeById(id);
        return Result.success();
    }
}

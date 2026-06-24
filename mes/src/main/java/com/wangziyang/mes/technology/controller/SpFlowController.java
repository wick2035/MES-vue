package com.wangziyang.mes.technology.controller;


import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.technology.entity.SpFlow;
import com.wangziyang.mes.technology.request.SpFlowReq;
import com.wangziyang.mes.technology.service.ISpFlowService;
import io.swagger.annotations.ApiImplicitParam;
import io.swagger.annotations.ApiImplicitParams;
import io.swagger.annotations.ApiOperation;
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
 * 流程控制器
 * </p>
 *
 * @author WangZiYang
 * @since 2020-03-14
 */
@Controller
@RequestMapping("/basedata/flow")
public class SpFlowController extends BaseController {

    @Autowired
    public ISpFlowService iSpFlowService;

    /**
     * 流程信息分页查询
     *
     * @param req 请求参数
     * @return Result 执行结果
     */
    @ApiOperation("流程信息分页查询")
    @ApiImplicitParams({@ApiImplicitParam(name = "req", value = "请求参数", defaultValue = "请求参数")})
    @PostMapping("/page")
    @ResponseBody
    public Result page(SpFlowReq req) {
        IPage result = iSpFlowService.page(req);
        return Result.success(result);
    }


    /**
     * 流程头信息查询（单条）
     *
     * @param id 主键
     * @return Result 执行结果
     */
    @ApiOperation("工艺路线头信息查询")
    @GetMapping("/detail")
    @ResponseBody
    public Result detail(@RequestParam String id) {
        return Result.success(iSpFlowService.getById(id));
    }

    /**
     * 流程全部信息查询
     *
     * @return Result 执行结果
     */
    @ApiOperation("流程全部信息查询")
    @GetMapping("/list")
    @ResponseBody
    public Result list() {
        QueryWrapper queryWrapper = new QueryWrapper();
        //queryWrapper.eq("is_deleted", "0");
        List<SpFlow> list = iSpFlowService.list(queryWrapper);
        return Result.success(list);
    }

    /**
     * 工艺路线新增 / 修改
     *
     * @param record 工艺路线信息
     * @return Result 执行结果
     */
    @ApiOperation("工艺路线新增/修改")
    @PostMapping("/add-or-update")
    @ResponseBody
    public Result addOrUpdate(SpFlow record) {
        record.setFlowDesc(StringUtils.trimToEmpty(record.getFlowDesc()));
        if (StringUtils.isEmpty(record.getFlowDesc())) {
            return Result.failure("工艺路线名称不能为空");
        }

        boolean create = StringUtils.isEmpty(record.getId());
        if (create) {
            record.setFlow(iSpFlowService.nextFlowCode());
        } else {
            SpFlow old = iSpFlowService.getById(record.getId());
            if (old == null) {
                return Result.failure("工艺路线记录不存在");
            }
            record.setFlow(old.getFlow());
        }

        // 名称唯一性校验
        QueryWrapper<SpFlow> duplicateQw = new QueryWrapper<>();
        duplicateQw.eq("flow_desc", record.getFlowDesc());
        if (!create) duplicateQw.ne("id", record.getId());
        if (iSpFlowService.count(duplicateQw) > 0) {
            return Result.failure("工艺路线名称已存在，请更换名称");
        }

        iSpFlowService.saveOrUpdate(record);
        return Result.success(record.getId());
    }

    /**
     * 工艺路线删除
     *
     * @param id 主键
     * @return Result 执行结果
     */
    @ApiOperation("工艺路线删除")
    @PostMapping("/delete")
    @ResponseBody
    public Result delete(@RequestParam String id) {
        iSpFlowService.removeById(id);
        return Result.success();
    }

}

package com.wangziyang.mes.technology.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.wangziyang.mes.technology.entity.SpFlow;
import com.wangziyang.mes.technology.mapper.SpFlowMapper;
import com.wangziyang.mes.technology.service.ISpFlowService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

/**
 * <p>
 *  服务实现类
 * </p>
 *
 * @author WangZiYang
 * @since 2020-03-14
 */
@Service
public class SpFlowServiceImpl extends ServiceImpl<SpFlowMapper, SpFlow> implements ISpFlowService {

    private static final String PREFIX = "GY";

    @Override
    public String nextFlowCode() {
        QueryWrapper<SpFlow> qw = new QueryWrapper<>();
        qw.likeRight("flow", PREFIX).orderByDesc("flow").last("limit 1");
        SpFlow last = getOne(qw);
        int next = 1;
        if (last != null && last.getFlow() != null && last.getFlow().length() > PREFIX.length()) {
            try {
                next = Integer.parseInt(last.getFlow().substring(PREFIX.length())) + 1;
            } catch (NumberFormatException ignore) {
            }
        }
        return PREFIX + String.format("%06d", next);
    }
}

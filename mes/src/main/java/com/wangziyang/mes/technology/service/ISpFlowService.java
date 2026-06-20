package com.wangziyang.mes.technology.service;

import com.wangziyang.mes.technology.entity.SpFlow;
import com.baomidou.mybatisplus.extension.service.IService;

/**
 * <p>
 *  流程服务类
 * </p>
 *
 * @author WangZiYang
 * @since 2020-03-14
 */
public interface ISpFlowService extends IService<SpFlow> {

    /**
     * 生成下一个工艺路线编码（前缀 GY + 6 位流水）
     */
    String nextFlowCode();

}

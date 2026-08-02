package org.dherhf.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.dherhf.common.PageResult;
import org.dherhf.common.Result;
import org.dherhf.dto.ScheduleCreateDTO;
import org.dherhf.dto.ScheduleUpdateDTO;
import org.dherhf.service.ScheduleService;
import org.dherhf.vo.ScheduleDetailVO;
import org.dherhf.vo.ScheduleListVO;
import org.dherhf.vo.ScheduleVO;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/schedules")
@RequiredArgsConstructor
public class ScheduleController {

    private final ScheduleService scheduleService;

    @PostMapping
    public Result<ScheduleVO> create(@Valid @RequestBody ScheduleCreateDTO dto) {
        return scheduleService.createSchedule(dto);
    }

    @PutMapping("/{id}")
    public Result<ScheduleVO> update(@PathVariable Long id, @Valid @RequestBody ScheduleUpdateDTO dto) {
        return scheduleService.updateSchedule(id, dto);
    }

    @PutMapping("/{id}/cancel")
    public Result<Void> cancel(@PathVariable Long id) {
        return scheduleService.cancelSchedule(id);
    }

    @PutMapping("/{id}/end")
    public Result<Void> end(@PathVariable Long id) {
        return scheduleService.endSchedule(id);
    }

    @GetMapping
    public Result<PageResult<ScheduleListVO>> list(
            @RequestParam(required = false) Long movieId,
            @RequestParam(required = false) Long cinemaId,
            @RequestParam(required = false) Long hallId,
            @RequestParam(required = false) String showDate,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size) {
        return scheduleService.adminList(movieId, cinemaId, hallId, showDate, status, page, size);
    }

    @GetMapping("/{id}")
    public Result<ScheduleDetailVO> detail(@PathVariable Long id) {
        return scheduleService.adminDetail(id);
    }
}

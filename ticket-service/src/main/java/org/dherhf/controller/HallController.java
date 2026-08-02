package org.dherhf.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.dherhf.common.PageResult;
import org.dherhf.common.Result;
import org.dherhf.dto.HallCreateDTO;
import org.dherhf.dto.HallLayoutDTO;
import org.dherhf.dto.HallUpdateDTO;
import org.dherhf.service.HallService;
import org.dherhf.vo.HallDetailVO;
import org.dherhf.vo.HallListVO;
import org.dherhf.vo.HallVO;
import org.dherhf.vo.LayoutResultVO;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/halls")
@RequiredArgsConstructor
public class HallController {

    private final HallService hallService;

    @PostMapping
    public Result<HallVO> create(@Valid @RequestBody HallCreateDTO dto) {
        return hallService.createHall(dto);
    }

    @GetMapping
    public Result<PageResult<HallListVO>> list(
            @RequestParam(required = false) Long cinemaId,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String screenType,
            @RequestParam(required = false) Integer status,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size) {
        return hallService.list(cinemaId, name, screenType, status, page, size);
    }

    @GetMapping("/{id}")
    public Result<HallDetailVO> detail(@PathVariable Long id) {
        return hallService.detail(id);
    }

    @PutMapping("/{id}")
    public Result<HallVO> update(@PathVariable Long id, @Valid @RequestBody HallUpdateDTO dto) {
        return hallService.updateHall(id, dto);
    }

    @PutMapping("/{id}/layout")
    public Result<LayoutResultVO> saveLayout(@PathVariable Long id, @Valid @RequestBody HallLayoutDTO dto) {
        return hallService.saveLayout(id, dto);
    }
}

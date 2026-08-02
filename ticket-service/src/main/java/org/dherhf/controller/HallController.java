package org.dherhf.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.dherhf.common.PageResult;
import org.dherhf.common.Result;
import org.dherhf.common.AuditLog;
import org.dherhf.dto.HallCreateDTO;
import org.dherhf.dto.HallLayoutDTO;
import org.dherhf.dto.HallUpdateDTO;
import org.dherhf.service.HallService;
import org.dherhf.vo.HallDetailVO;
import org.dherhf.vo.HallListVO;
import org.dherhf.vo.HallVO;
import org.dherhf.vo.LayoutResultVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

@Tag(name = "影厅管理", description = "影厅CRUD/座位布局管理")
@RestController
@RequestMapping("/api/v1/admin/halls")
@RequiredArgsConstructor
public class HallController {

    private final HallService hallService;

    @Operation(summary = "新增影厅")
    @PostMapping
    @AuditLog(action = "CREATE", targetType = "hall")
    public Result<HallVO> create(@Valid @RequestBody HallCreateDTO dto) {
        return hallService.createHall(dto);
    }

    @Operation(summary = "影厅列表")
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

    @Operation(summary = "影厅详情")
    @GetMapping("/{id}")
    public Result<HallDetailVO> detail(@PathVariable Long id) {
        return hallService.detail(id);
    }

    @Operation(summary = "编辑影厅")
    @PutMapping("/{id}")
    @AuditLog(action = "UPDATE", targetType = "hall")
    public Result<HallVO> update(@PathVariable Long id, @Valid @RequestBody HallUpdateDTO dto) {
        return hallService.updateHall(id, dto);
    }

    @Operation(summary = "保存座位布局")
    @PutMapping("/{id}/layout")
    @AuditLog(action = "UPDATE", targetType = "hall")
    public Result<LayoutResultVO> saveLayout(@PathVariable Long id, @Valid @RequestBody HallLayoutDTO dto) {
        return hallService.saveLayout(id, dto);
    }
}

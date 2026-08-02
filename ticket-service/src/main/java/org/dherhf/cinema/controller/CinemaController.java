package org.dherhf.cinema.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.dherhf.common.result.PageResult;
import org.dherhf.common.result.Result;
import org.dherhf.common.annotation.AuditLog;
import org.dherhf.cinema.dto.CinemaCreateDTO;
import org.dherhf.cinema.dto.CinemaUpdateDTO;
import org.dherhf.cinema.service.CinemaService;
import org.dherhf.cinema.vo.CinemaListVO;
import org.dherhf.cinema.vo.CinemaVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

@Tag(name = "影院管理(管理端)", description = "影院CRUD/停业营业")
@RestController
@RequestMapping("/api/v1/admin/cinemas")
@RequiredArgsConstructor
public class CinemaController {

    private final CinemaService cinemaService;

    @Operation(summary = "新增影院")
    @PostMapping
    @AuditLog(action = "CREATE", targetType = "cinema")
    public Result<CinemaVO> create(@Valid @RequestBody CinemaCreateDTO dto) {
        return cinemaService.createCinema(dto);
    }

    @Operation(summary = "编辑影院")
    @PutMapping("/{id}")
    @AuditLog(action = "UPDATE", targetType = "cinema")
    public Result<CinemaVO> update(@PathVariable Long id, @Valid @RequestBody CinemaUpdateDTO dto) {
        return cinemaService.updateCinema(id, dto);
    }

    @Operation(summary = "影院停业")
    @PutMapping("/{id}/close")
    @AuditLog(action = "UPDATE", targetType = "cinema")
    public Result<Void> close(@PathVariable Long id) {
        return cinemaService.closeCinema(id);
    }

    @Operation(summary = "影院营业")
    @PutMapping("/{id}/open")
    @AuditLog(action = "UPDATE", targetType = "cinema")
    public Result<Void> open(@PathVariable Long id) {
        return cinemaService.openCinema(id);
    }

    @Operation(summary = "影院列表(管理端)")
    @GetMapping
    public Result<PageResult<CinemaListVO>> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer status,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size) {
        return cinemaService.adminList(keyword, status, page, size);
    }

    @Operation(summary = "影院详情(管理端)")
    @GetMapping("/{id}")
    public Result<CinemaVO> detail(@PathVariable Long id) {
        return cinemaService.adminDetail(id);
    }
}

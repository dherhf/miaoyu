package org.dherhf.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.dherhf.common.PageResult;
import org.dherhf.common.Result;
import org.dherhf.dto.CinemaCreateDTO;
import org.dherhf.dto.CinemaUpdateDTO;
import org.dherhf.service.CinemaService;
import org.dherhf.vo.CinemaListVO;
import org.dherhf.vo.CinemaVO;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/cinemas")
@RequiredArgsConstructor
public class CinemaController {

    private final CinemaService cinemaService;

    @PostMapping
    public Result<CinemaVO> create(@Valid @RequestBody CinemaCreateDTO dto) {
        return cinemaService.createCinema(dto);
    }

    @PutMapping("/{id}")
    public Result<CinemaVO> update(@PathVariable Long id, @Valid @RequestBody CinemaUpdateDTO dto) {
        return cinemaService.updateCinema(id, dto);
    }

    @PutMapping("/{id}/close")
    public Result<Void> close(@PathVariable Long id) {
        return cinemaService.closeCinema(id);
    }

    @PutMapping("/{id}/open")
    public Result<Void> open(@PathVariable Long id) {
        return cinemaService.openCinema(id);
    }

    @GetMapping
    public Result<PageResult<CinemaListVO>> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer status,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size) {
        return cinemaService.adminList(keyword, status, page, size);
    }

    @GetMapping("/{id}")
    public Result<CinemaVO> detail(@PathVariable Long id) {
        return cinemaService.adminDetail(id);
    }
}

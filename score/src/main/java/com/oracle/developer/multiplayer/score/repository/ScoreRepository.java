package com.oracle.developer.multiplayer.score.repository;

import com.oracle.developer.multiplayer.score.data.Score;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.PagingAndSortingRepository;

import java.util.Optional;

public interface
ScoreRepository extends CrudRepository<Score, Long>, PagingAndSortingRepository<Score, Long> {
    Page<Score> findAll(Pageable pageable);

    Optional<Score> findByUuid(String uuid);

    void deleteAll();
}

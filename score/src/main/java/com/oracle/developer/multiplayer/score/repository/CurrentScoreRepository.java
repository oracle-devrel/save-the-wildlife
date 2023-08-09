package com.oracle.developer.multiplayer.score.repository;

import com.oracle.developer.multiplayer.score.data.CurrentScore;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.Optional;

public interface
CurrentScoreRepository extends CrudRepository<CurrentScore, Long> {
    List<CurrentScore> findAll(Pageable pageable);

    Optional<CurrentScore> findByUuid(String uuid);

    void deleteByUuid(String uuid);

    void deleteAll();
}

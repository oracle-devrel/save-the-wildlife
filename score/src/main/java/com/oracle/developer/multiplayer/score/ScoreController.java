package com.oracle.developer.multiplayer.score;

import com.oracle.developer.multiplayer.score.data.Score;
import com.oracle.developer.multiplayer.score.dao.ScoreDAO;
import com.oracle.developer.multiplayer.score.repository.ScoreRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
public class ScoreController {
    Logger logger = LoggerFactory.getLogger(ScoreController.class);

    private final ScoreRepository repository;

    public ScoreController(ScoreRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/api/top/score")
    List<ScoreDAO> getAll() {
        logger.info("GET /api/top/score");
        List<ScoreDAO> all = new ArrayList<>();
        Sort sortByScore = Sort.by(Sort.Direction.DESC, "score");
        Pageable topResults = PageRequest.of(0,10, sortByScore);
        repository
                .findAll(topResults)
                .forEach(s -> all.add(new ScoreDAO(s.getUuid(),s.getName(), s.getScore() )));
        return all;
    }

    @GetMapping("/api/top/score/{uuid}")
    ScoreDAO getByUuid(@PathVariable("uuid") String uuid) {
        logger.info("GET /api/top/score/" + uuid);
        Score score = repository.findByUuid(uuid).orElseThrow(() -> new NotAuthorizedOrNotFound());
        return new ScoreDAO(score.getUuid(),score.getName(), score.getScore() );
    }

    @DeleteMapping("/api/top/score")
    ResponseEntity<Void> deleteAll() {
        logger.info("DELETE /api/top/score");
        repository.deleteAll();
        return new ResponseEntity<Void>(HttpStatus.NO_CONTENT);
    }

}

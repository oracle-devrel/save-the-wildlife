package com.oracle.developer.multiplayer.score.dao;

import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@ToString
@EqualsAndHashCode
public class ScoreDAO {

    public ScoreDAO(String uuid, String name, Long score) {
        this.uuid = uuid;
        this.name = name;
        this.score = score;
    }

    @Getter
    @Setter
    String uuid;

    @Getter
    @Setter
    String name;

    @Getter
    @Setter
    Long score;
}

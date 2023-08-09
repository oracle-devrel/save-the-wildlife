package com.oracle.developer.multiplayer.score.data;

import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;

@Entity
@ToString
@EqualsAndHashCode
public class CurrentScore {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Getter
    Long id;

    @Getter
    @Setter
    String uuid;

    @Getter
    @Setter
    String name;

    @Getter
    @Setter
    Long score;

    public CurrentScore() {
        this.uuid = "";
        this.name = "";
        this.score = 0L;
    }

    public CurrentScore(String uuid, String name, Long score) {
        this.uuid = uuid;
        this.name = name;
        this.score = score;
    }
}

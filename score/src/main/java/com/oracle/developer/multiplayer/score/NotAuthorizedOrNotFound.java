package com.oracle.developer.multiplayer.score;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(code= HttpStatus.NOT_FOUND, reason = "Not Authorized or Not Found")
public class NotAuthorizedOrNotFound extends RuntimeException {
}

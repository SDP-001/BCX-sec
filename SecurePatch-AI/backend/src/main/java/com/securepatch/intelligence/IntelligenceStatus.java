package com.securepatch.intelligence;

public record IntelligenceStatus(
        String provider,
        String state,
        boolean enabled,
        boolean available,
        String model,
        String detail) {
}

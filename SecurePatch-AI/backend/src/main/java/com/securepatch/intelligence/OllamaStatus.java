package com.securepatch.intelligence;

public record OllamaStatus(String state, boolean enabled, boolean available, String model, String detail) {
}

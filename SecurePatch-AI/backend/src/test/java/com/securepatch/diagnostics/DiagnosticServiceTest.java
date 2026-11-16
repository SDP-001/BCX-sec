package com.securepatch.diagnostics;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class DiagnosticServiceTest {
    private final DiagnosticService diagnosticService = new DiagnosticService();

    @Test
    void websiteCheckFlagsMissingScheme() {
        DiagnosticResponse response = diagnosticService.analyze(new DiagnosticRequest("website", "example.com/login"));

        assertThat(response.status()).isIn("WARNINGS", "CRITICAL");
        assertThat(response.findings())
                .anySatisfy(finding -> {
                    assertThat(finding.title()).isEqualTo("Missing URL scheme");
                    assertThat(finding.fix()).contains("https://");
                });
    }

    @Test
    void softwareCheckFlagsNullPointerErrors() {
        DiagnosticResponse response = diagnosticService.analyze(new DiagnosticRequest("software", "NullPointerException\n at com.example.Service.load(Service.java:42)"));

        assertThat(response.status()).isIn("WARNINGS", "CRITICAL");
        assertThat(response.findings())
                .anySatisfy(finding -> {
                    assertThat(finding.title()).isEqualTo("Null pointer problem");
                    assertThat(finding.fix()).contains("null");
                });
    }
}

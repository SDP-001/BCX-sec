package com.securepatch.diagnostics;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class DiagnosticService {
    private static final Set<String> VALID_TARGET_TYPES = EnumSet.of(
            TargetType.WEBSITE,
            TargetType.SOFTWARE,
            TargetType.STACK_TRACE).stream().map(TargetType::value).collect(java.util.stream.Collectors.toUnmodifiableSet());

    public DiagnosticResponse analyze(DiagnosticRequest request) {
        if (request == null || request.input() == null || request.input().isBlank()) {
            throw new IllegalArgumentException("Input is required.");
        }

        String targetType = normalizeTargetType(request.targetType());
        String input = request.input().trim();
        List<DiagnosticFinding> findings = new ArrayList<>();

        if ("website".equals(targetType)) {
            analyzeWebsite(findings, input);
        } else {
            analyzeSoftware(findings, input);
        }

        if (findings.isEmpty()) {
            findings.add(new DiagnosticFinding(
                    "INFO",
                    "No obvious issue found",
                    "The current rules did not detect a common error pattern in the supplied input.",
                    "Review the exact browser console or runtime log to confirm whether the issue is configuration-related or environment-specific."));
        }

        int score = calculateScore(findings);
        String status = score >= 80 ? "HEALTHY" : score >= 50 ? "WARNINGS" : "CRITICAL";
        String summary = switch (targetType) {
            case "website" -> "Website check completed with heuristic diagnostics.";
            case "software" -> "Software check completed with code and runtime diagnostics.";
            default -> "Stack trace review completed with likely root-cause suggestions.";
        };

        return new DiagnosticResponse(targetType, summary, score, status, findings);
    }

    private String normalizeTargetType(String targetType) {
        if (targetType == null || targetType.isBlank()) {
            return "website";
        }

        String normalized = targetType.trim().toLowerCase(Locale.ROOT);
        if (VALID_TARGET_TYPES.contains(normalized)) {
            return normalized;
        }

        if (normalized.contains("stack") || normalized.contains("trace") || normalized.contains("error")) {
            return "stack-trace";
        }
        if (normalized.contains("code") || normalized.contains("app") || normalized.contains("software") || normalized.contains("project")) {
            return "software";
        }
        return "website";
    }

    private void analyzeWebsite(List<DiagnosticFinding> findings, String input) {
        String url = input.trim();

        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            addFinding(findings, "HIGH", "Missing URL scheme", "The address is missing a protocol such as https://.", "Prefix the URL with https:// before testing it in a browser.");
        }
        if (url.contains(" ")) {
            addFinding(findings, "HIGH", "Whitespace in URL", "The url contains spaces or unexpected separators.", "Remove extra whitespace and keep the route as a single valid URL.");
        }
        if (url.contains("localhost") && !url.startsWith("http://localhost") && !url.startsWith("https://localhost")) {
            addFinding(findings, "MEDIUM", "Local host is not properly scoped", "The URL appears to target a local service without a valid localhost scheme.", "Use http://localhost:PORT or https://localhost:PORT for local development checks.");
        }
        if (url.contains("404") || url.contains("/404") || url.toLowerCase(Locale.ROOT).contains("not-found")) {
            addFinding(findings, "HIGH", "Likely missing page or route", "The URL looks like a missing resource or broken route.", "Check the route, confirm the page exists, and correct redirects or server mappings.");
        }
        if (url.contains("500") || url.contains("500")) {
            addFinding(findings, "CRITICAL", "Likely server-side failure", "The target or log text references a 500 error state.", "Review server logs, API configuration, and the backend service that serves this route.");
        }
        if (url.toLowerCase(Locale.ROOT).contains("err_connection_refused") || url.toLowerCase(Locale.ROOT).contains("connection refused")) {
            addFinding(findings, "CRITICAL", "Connection refused", "The site or service is not accepting connections on the target port.", "Confirm the service is running and listening on the expected host and port.");
        }
        if (url.toLowerCase(Locale.ROOT).contains("ssl") || url.toLowerCase(Locale.ROOT).contains("certificate")) {
            addFinding(findings, "HIGH", "SSL or certificate problem detected", "The input references TLS or certificate errors.", "Validate the certificate chain, expiry date, and trusted certificates for the domain.");
        }
    }

    private void analyzeSoftware(List<DiagnosticFinding> findings, String input) {
        String lower = input.toLowerCase(Locale.ROOT);

        if (lower.contains("typeerror") || lower.contains("cannot read properties of undefined") || lower.contains("reading 'length'")) {
            addFinding(findings, "HIGH", "Null or undefined value access", "The runtime is trying to read a property from a missing object or array.", "Add a guard before dereferencing values, and verify the expected object is created before use.");
        }
        if (lower.contains("referenceerror") || lower.contains("is not defined")) {
            addFinding(findings, "HIGH", "Unresolved symbol or missing import", "The application references a variable, function, or module that is not defined in scope.", "Import the missing dependency or define the value before the call site.");
        }
        if (lower.contains("syntaxerror") || lower.contains("unexpected token") || lower.contains("parse error")) {
            addFinding(findings, "CRITICAL", "Syntax issue", "The code or configuration text contains a syntax error or invalid token ordering.", "Fix the parser error, then rerun the build or application to confirm the syntax is valid.");
        }
        if (lower.contains("module not found") || lower.contains("cannot find module") || lower.contains("command not found")) {
            addFinding(findings, "HIGH", "Missing dependency or executable", "The project is trying to load something that is not available in the current environment.", "Install the dependency or executable and verify the PATH or package manifest is correct.");
        }
        if (lower.contains("econnrefused") || lower.contains("connection refused") || lower.contains("failed to fetch")) {
            addFinding(findings, "CRITICAL", "Connectivity issue", "The service is failing to reach a local or remote dependency.", "Confirm the host, port, credentials, and network path before retrying the request.");
        }
        if (lower.contains("permission denied") || lower.contains("access denied") || lower.contains("unauthorized")) {
            addFinding(findings, "HIGH", "Access or privilege issue", "The process is blocked by a missing permission or authorization.", "Review file permissions, credentials, and the required authorization scope before retrying.");
        }
        if (lower.contains("port already in use") || lower.contains("address already in use")) {
            addFinding(findings, "MEDIUM", "Port collision", "The service is trying to bind to a port already occupied by another process.", "Stop the conflicting process or change the configured port.");
        }
        if (lower.contains("segmentation fault") || lower.contains("core dump") || lower.contains("fatal error")) {
            addFinding(findings, "CRITICAL", "Fatal runtime failure", "The application has hit a low-level crash or process-level failure.", "Capture a reproducible stack trace and isolate the crashing component before patching." );
        }
        if (lower.contains("nullpointerexception") || lower.contains("npe")) {
            addFinding(findings, "HIGH", "Null pointer problem", "The code dereferences a null object without a null guard.", "Validate input values and guard against null before the dereference occurs.");
        }
    }

    private void addFinding(List<DiagnosticFinding> findings, String severity, String title, String message, String fix) {
        findings.add(new DiagnosticFinding(severity, title, message, fix));
    }

    private int calculateScore(List<DiagnosticFinding> findings) {
        int weighted = 0;
        for (DiagnosticFinding finding : findings) {
            weighted += switch (finding.severity().toUpperCase(Locale.ROOT)) {
                case "CRITICAL" -> 35;
                case "HIGH" -> 24;
                case "MEDIUM" -> 14;
                case "LOW" -> 7;
                default -> 0;
            };
        }
        return Math.max(0, Math.min(100, 100 - (weighted / Math.max(findings.size(), 1))));
    }

    private enum TargetType {
        WEBSITE("website"),
        SOFTWARE("software"),
        STACK_TRACE("stack-trace");

        private final String value;

        TargetType(String value) {
            this.value = value;
        }

        public String value() {
            return value;
        }
    }
}

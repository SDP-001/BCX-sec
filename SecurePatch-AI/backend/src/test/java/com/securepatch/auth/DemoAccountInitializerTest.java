package com.securepatch.auth;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DemoAccountInitializerTest {
    @Mock
    private UserAccountRepository users;

    @Mock
    private AuthService authService;

    @Test
    void createsDemoAccountOnlyWhenMissing() {
        when(users.existsByEmail("demo@bytecodx.local")).thenReturn(false);

        initializer().run(null);

        verify(authService).register("demo@bytecodx.local", "Bytecodx Demo", "BytecodxDemo2026!");
    }

    @Test
    void doesNotChangeAnExistingDemoAccount() {
        when(users.existsByEmail("demo@bytecodx.local")).thenReturn(true);

        initializer().run(null);

        verify(authService, never()).register("demo@bytecodx.local", "Bytecodx Demo", "BytecodxDemo2026!");
    }

    private DemoAccountInitializer initializer() {
        return new DemoAccountInitializer(users, authService, "Demo@Bytecodx.local", "BytecodxDemo2026!");
    }
}

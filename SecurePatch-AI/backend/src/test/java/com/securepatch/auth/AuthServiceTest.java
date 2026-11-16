package com.securepatch.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {
    @Mock
    private UserAccountRepository users;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AuthService authService;

    @Test
    void registrationNormalizesEmailAndStoresOnlyEncodedPassword() {
        when(users.existsByEmail("person@example.com")).thenReturn(false);
        when(passwordEncoder.encode("a-long-example-password")).thenReturn("$2a$encoded");
        when(users.save(any(UserAccount.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserAccount account = authService.register(" Person@Example.com ", " Example Person ", "a-long-example-password");

        assertThat(account.getEmail()).isEqualTo("person@example.com");
        assertThat(account.getDisplayName()).isEqualTo("Example Person");
        assertThat(account.getPassword()).isEqualTo("$2a$encoded");
        verify(passwordEncoder).encode("a-long-example-password");
    }
}

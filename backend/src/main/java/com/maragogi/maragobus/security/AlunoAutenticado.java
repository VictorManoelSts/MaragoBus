package com.maragogi.maragobus.security;

import java.util.Objects;
import java.util.UUID;

/** Identidade que deve ser fornecida por um provedor de autenticação confiável. */
public record AlunoAutenticado(UUID id) {
    public AlunoAutenticado {
        Objects.requireNonNull(id);
    }
}

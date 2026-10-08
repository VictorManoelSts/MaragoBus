package com.maragogi.maragobus.dto.usuario;

import com.maragogi.maragobus.enums.TipoUsuario;

import java.util.UUID;

public record UsuarioResponse(
        UUID id,
        String nome,
        String email,
        String telefone,
        TipoUsuario tipoUsuario,
        boolean ativo
) {}
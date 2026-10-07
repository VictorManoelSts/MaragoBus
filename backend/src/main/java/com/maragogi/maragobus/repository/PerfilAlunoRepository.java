package com.maragogi.maragobus.repository;

import com.maragogi.maragobus.entity.PerfilAluno;
import com.maragogi.maragobus.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PerfilAlunoRepository extends JpaRepository<PerfilAluno, UUID> {

    Optional<PerfilAluno> findByUsuarioId(UUID usuarioID);

    boolean existsByUsuarioId(UUID usuarioId);
}

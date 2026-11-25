package com.maragogi.maragobus.repository;

import com.maragogi.maragobus.entity.Curso;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CursoRepository extends JpaRepository<Curso, UUID> {

    Optional<Curso> findByNome(String nome);

    boolean existsByNome(String nome);

    List<Curso> findAllByAtivoTrue();
    Page<Curso> findAllByAtivoTrue(Pageable pageable);
}

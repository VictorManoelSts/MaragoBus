package com.maragogi.maragobus.repository;

import com.maragogi.maragobus.entity.Faculdade;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FaculdadeRepository extends JpaRepository<Faculdade, UUID> {

    Optional<Faculdade> findByNome(String nome);

    boolean existsByNome(String nome);

    List<Faculdade> findByAtivoTrue();

    Page<Faculdade> findByAtivoTrue(Pageable pagina);
}

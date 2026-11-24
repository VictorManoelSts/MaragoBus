package com.maragogi.maragobus.repository;

import com.maragogi.maragobus.entity.LeituraAvisoAluno;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LeituraAvisoAlunoRepository extends JpaRepository<LeituraAvisoAluno, UUID> {
    Optional<LeituraAvisoAluno> findByAvisoIdAndAlunoId(UUID avisoId, UUID alunoId);
    List<LeituraAvisoAluno> findByAlunoIdAndAvisoIdIn(UUID alunoId, Collection<UUID> avisoIds);
}
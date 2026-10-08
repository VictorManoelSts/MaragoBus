package com.maragogi.maragobus.entity;

import com.maragogi.maragobus.enums.ModalidadeEnsino;
import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(
        name = "cursos_ofertados",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_curso_faculdade_modalidade",
                        columnNames = {
                                "curso_id",
                                "faculdade_id",
                                "modalidade_ensino"
                        }
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CursoOfertado {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "curso_id", nullable = false)
    private Curso curso;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "faculdade_id", nullable = false)
    private Faculdade faculdade;

    @Enumerated(EnumType.STRING)
    @Column(name = "modalidade_ensino", nullable = false, length = 20)
    private ModalidadeEnsino modalidadeEnsino;

    @Builder.Default
    @Column(nullable = false)
    private boolean ativo = true;
}

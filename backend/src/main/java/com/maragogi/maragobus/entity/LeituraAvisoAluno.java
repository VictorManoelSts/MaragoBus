package com.maragogi.maragobus.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "leituras_avisos_alunos",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_leitura_aviso_aluno",
                columnNames = {"aviso_id", "aluno_id"}
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeituraAvisoAluno {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "aviso_id", nullable = false)
    private AvisoAdministrativo aviso;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "aluno_id", nullable = false)
    private Usuario aluno;

    @Column(name = "data_hora_leitura", nullable = false)
    private LocalDateTime dataHoraLeitura;
}
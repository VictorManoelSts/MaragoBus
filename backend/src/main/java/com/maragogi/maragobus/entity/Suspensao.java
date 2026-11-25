package com.maragogi.maragobus.entity;

import com.maragogi.maragobus.enums.DuracaoSuspensao;
import com.maragogi.maragobus.enums.StatusSuspensao;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "suspensoes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Suspensao {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "advertencia_origem_id", nullable = false, unique = true)
    private Advertencia advertenciaOrigem;

    @Enumerated(EnumType.STRING)
    @Column(name = "duracao", length = 20)
    private DuracaoSuspensao duracao;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private StatusSuspensao status = StatusSuspensao.APLICADA;

    @Column(length = 500)
    private String justificativa;

    @Column(name = "data_inicio")
    private LocalDate dataInicio;

    @Column(name = "data_fim")
    private LocalDate dataFim;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "administrador_responsavel_id")
    private Usuario administradorResponsavel;

    @Column(name = "data_hora_aplicacao")
    private LocalDateTime dataHoraAplicacao;
}

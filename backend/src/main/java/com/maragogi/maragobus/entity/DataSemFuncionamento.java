package com.maragogi.maragobus.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "datas_sem_funcionamento")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DataSemFuncionamento {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "data", nullable = false, unique = true)
    private LocalDate data;

    @Column(name = "motivo", nullable = false, length = 500)
    private String motivo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "administrador_responsavel_id", nullable = false)
    private Usuario administradorResponsavel;

    @Column(name = "data_hora_cadastro", nullable = false)
    private LocalDateTime dataHoraCadastro;
}
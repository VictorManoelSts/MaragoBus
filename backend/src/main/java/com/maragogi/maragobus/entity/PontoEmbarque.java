package com.maragogi.maragobus.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "pontos_embarque")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PontoEmbarque {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 150, unique = true)
    private String nome;

    @Column(length = 256)
    private String descricao;

    @Builder.Default
    @Column(nullable = false)
    private Boolean ativo = true;
}

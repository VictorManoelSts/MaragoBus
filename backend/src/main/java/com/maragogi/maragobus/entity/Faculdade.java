package com.maragogi.maragobus.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "faculdades")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Faculdade {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 150, unique = true)
    private String nome;

    @Builder.Default
    @Column(nullable = false)
    private boolean ativo = true;

}

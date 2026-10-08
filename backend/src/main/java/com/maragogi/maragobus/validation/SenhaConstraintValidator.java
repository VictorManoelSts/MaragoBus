package com.maragogi.maragobus.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class SenhaConstraintValidator implements ConstraintValidator<SenhaValida, String> {
    @Override
    public boolean isValid(String senha, ConstraintValidatorContext context) {
        return ValidadorSenha.ehValida(senha);
    }
}

package com.nutrition.exception;

import lombok.Getter;
import java.math.BigDecimal;

@Getter
public class LowBalanceException extends RuntimeException {
    private final BigDecimal currentBalance;
    private final BigDecimal requiredAmount;
    private final BigDecimal deficit;

    public LowBalanceException(BigDecimal currentBalance, BigDecimal requiredAmount, BigDecimal deficit, String message) {
        super(message);
        this.currentBalance = currentBalance;
        this.requiredAmount = requiredAmount;
        this.deficit = deficit;
    }
}

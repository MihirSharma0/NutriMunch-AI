package com.nutrition.service;

import com.nutrition.entity.SystemSetting;
import com.nutrition.repository.SystemSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Platform System Settings Service.
Provides cached database lookups for dynamic platform configuration values.
 */
@Service
@RequiredArgsConstructor
public class SystemSettingService {

    private final SystemSettingRepository systemSettingRepository;

    /**
     * Executes is otp enabled operation.
     */
    public boolean isOtpEnabled() {
        return systemSettingRepository.findBySettingKey("OTP_ENABLED")
                .map(setting -> Boolean.parseBoolean(setting.getSettingValue()))
                .orElse(false);
    }

    /**
     * Executes set otp enabled operation.
     */
    public void setOtpEnabled(boolean enabled) {
        SystemSetting setting = systemSettingRepository.findBySettingKey("OTP_ENABLED")
                .orElse(new SystemSetting());
        setting.setSettingKey("OTP_ENABLED");
        setting.setSettingValue(String.valueOf(enabled));
        systemSettingRepository.save(setting);
    }

    public String getSetting(String key, String defaultValue) {
        return systemSettingRepository.findBySettingKey(key)
                .map(SystemSetting::getSettingValue)
                .filter(val -> !val.isBlank())
                .orElse(defaultValue);
    }

    public void setSetting(String key, String value) {
        SystemSetting setting = systemSettingRepository.findBySettingKey(key)
                .orElse(new SystemSetting());
        setting.setSettingKey(key);
        setting.setSettingValue(value != null ? value.trim() : "");
        systemSettingRepository.save(setting);
    }
}

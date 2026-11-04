package com.nutrition.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Rejects requests whose declared body exceeds a configurable limit.
 *
 * <p>Image analysis accepts a base64 data URL inside a JSON body, and a single large
 * upload holds the whole payload in memory. On a small container that is enough for a
 * few concurrent requests to exhaust the heap and restart the process. This filter
 * refuses such requests up front and returns HTTP 413 instead.
 *
 * <p>The limit defaults to 16 MiB, which comfortably fits the base64 form of a
 * multi-megabyte phone photo, so normal use is unaffected. It is intentionally left at
 * the default filter order so that Spring Security and CORS run first and the 413
 * response still carries the usual headers.
 *
 * <p>Only the declared {@code Content-Length} is checked: a chunked request that omits
 * the header is not measured here. Browsers and axios always declare a length for JSON
 * bodies, which is the traffic this protects against.
 */
@Component
public class RequestBodySizeLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RequestBodySizeLimitFilter.class);

    private final long maxBodyBytes;

    /**
     * @param maxBodyBytes maximum accepted body size in bytes
     */
    public RequestBodySizeLimitFilter(@Value("${app.request.max-body-bytes:16777216}") long maxBodyBytes) {
        this.maxBodyBytes = maxBodyBytes;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        long declaredLength = request.getContentLengthLong();
        if (declaredLength > maxBodyBytes) {
            log.warn("Rejected {} {}: declared body of {} bytes exceeds the {} byte limit",
                    request.getMethod(), request.getRequestURI(), declaredLength, maxBodyBytes);
            response.setStatus(HttpServletResponse.SC_REQUEST_ENTITY_TOO_LARGE);
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write("{\"message\":\"Request body is too large. Maximum allowed size is "
                    + maxBodyBytes + " bytes.\"}");
            return;
        }
        filterChain.doFilter(request, response);
    }
}

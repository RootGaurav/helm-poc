package com.poc.userservice.controller;

import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/user-service")
public class UserController {

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "UP", "service", "user-service");
    }

    @GetMapping("/users")
    public List<Map<String, String>> getUsers() {
        return List.of(
            Map.of("id", "1", "name", "Rahul", "email", "rahul@poc.com"),
            Map.of("id", "2", "name", "Amit",  "email", "amit@poc.com")
        );
    }

    @GetMapping("/users/{id}")
    public Map<String, String> getUser(@PathVariable String id) {
        return Map.of("id", id, "name", "Rahul", "email", "rahul@poc.com");
    }
}

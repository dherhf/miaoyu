package org.dherhf.agent.repository;

import org.dherhf.agent.document.UserPreferenceDocument;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface UserPreferenceRepository extends MongoRepository<UserPreferenceDocument, String> {
    Optional<UserPreferenceDocument> findByUserId(Long userId);
}

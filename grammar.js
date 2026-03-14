module.exports = grammar({
  name: "hyperql",

  extras: ($) => [/\s/, $.comment],

  word: ($) => $.identifier,
  //
  // Removing `word` is the primary fix for no-whitespace parsing. With `word`
  // set, tree-sitter enforces hard word boundaries: keywords only match when
  // NOT followed by an identifier character. This breaks e.g. `ALLOWSPerson`
  // because the lexer sees the whole string as one identifier.
  //
  // Without `word`, the lexer is parser-state-directed: it only tries tokens
  // that are valid in the current parse state. So when only `ALLOWS` is valid
  // (not a bare identifier), it matches just `ALLOWS` and leaves `Person` for
  // the next token.

  conflicts: ($) => [
    [$.with_clause],
    [$.return_clause],
    [$.group_by_clause],
    [$.order_by_clause],
    [$.having_clause],
    [$.where_clause],
    [$.match_clause],
    [$.set_assignments],
    [$.pattern_object],
    [$.object_literal],
    [$.node_body],
    [$.edge_body],
    [$.enum_definition],
    [$.inline_allows_clause],
    [$.role_entry],
    [$.role_body_constraint_block],
    [$.metadata_block],
    [$.namespace_block],
    [$.state_clause],
    [$.accumulate_clause],
    [$.index_definition],
    [$.access_entry],
    [$.match_expression],
    [$.function_call],
    [$.with_entry, $.list_literal],
    [$.return_entry, $.list_literal],
    [$.where_clause, $.list_literal],
    [$.having_clause, $.list_literal],
    [$.window_spec],
    [$.window_frame],
    [$.binary_expression, $.subquery_expression],
    [$.type],
    [$.pattern, $.primary_expression],
    [$.with_entry, $.dotted_identifier],
    [$.with_entry, $.primary_expression],
    [$.with_entry, $.function_call],
    [$.dotted_identifier],
    [$.match_from_clause, $.pattern, $.primary_expression],
    [$.definition_item],
    [$.primary_expression, $.dotted_identifier],
    [$.dotted_identifier, $.window_call],
    [$.dotted_identifier, $.function_call],
  ],

  rules: {
    source_file: ($) => repeat($.statement),

    statement: ($) =>
      seq(
        choice(
          $.definition_statement,
          $.query_statement,
          $.mutation_statement,
          $.transaction_statement,
          $.import_statement,
          $.introspection_statement,
          $.prepare_statement,
          $.execute_statement,
          $.explain_statement, // v0.20: promoted to top-level (avoids EX- prefix conflict with EXECUTE)
          $.analyze_statement, // v0.20: promoted to top-level
          $.escape_sequence,
        ),
        ";",
      ),

    // -------------------------------------------------------------------------
    // Definitions (SDL)
    // -------------------------------------------------------------------------

    // v0.20: Replaced repeat(choice("DEFINE","ABSTRACT")) with an explicit
    // sequence. IF NOT EXISTS guard added to all definition statements.
    // ABSTRACT NODE removed; only ABSTRACT EDGE remains valid (enforced
    // semantically, not syntactically).
    // namespace_definition no longer carries its own DEFINE keyword — the
    // outer seq("DEFINE", ...) here provides it.
    definition_statement: ($) =>
      choice(
        seq(
          "DEFINE",
          optional(seq("IF", "NOT", "EXISTS")),
          optional("ABSTRACT"),
          $.definition_body,
        ),
        $.mixed_definition_batch,
      ),

    definition_body: ($) =>
      choice(
        $.namespace_definition,
        $.field_definition,
        $.enum_definition,
        $.struct_definition,
        $.trait_definition,
        $.node_definition,
        $.edge_definition,
        $.function_definition,
        $.aggregate_function_definition,
        $.index_definition,
        $.materialized_view_definition,
        $.view_definition, // v0.20: new
        $.union_definition, // v0.20: new
        $.access_role_definition,
        $.access_policy_definition,
        $.schema_definition,
      ),

    // v0.20: supports IF NOT EXISTS at batch level
    mixed_definition_batch: ($) =>
      seq(
        "DEFINE",
        optional(seq("IF", "NOT", "EXISTS")),
        "[",
        commaSep($.definition_item),
        "]",
      ),

    definition_item: ($) =>
      choice(
        seq("NAMESPACE", $.namespace_body),
        seq("FIELD", choice($.field_entry, $.field_batch)),
        seq("STRUCT", $.identifier, "{", commaSep($.identifier), "}"),
        // v0.20: TRAIT in batch now supports extends and metadata
        seq(
          "TRAIT",
          $.dotted_identifier,
          optional($.extends_clause),
          "{",
          commaSep($.identifier),
          "}",
          optional($.metadata_block),
        ),
        // v0.20: ABSTRACT NODE removed; optional("ABSTRACT") retained only for
        // EDGE batch entries
        seq("NODE", choice($.node_entry_full, $.node_batch)),
        seq(
          optional("ABSTRACT"),
          "EDGE",
          choice($.edge_entry_full, $.edge_batch),
        ),
        seq("ENUM", choice($.enum_entry_full, $.enum_batch)),
        seq("INDEX", choice($.index_entry_full, $.index_batch)),
        // v0.20: VIEW and UNION in mixed batches
        seq(
          "VIEW",
          $.dotted_identifier,
          optional(seq("(", commaSep($.view_parameter), ")")),
          "AS",
          repeat1($.query_clause),
        ),
        seq("UNION", $.dotted_identifier, "{", commaSep1($.union_variant), "}"),
      ),

    // v0.20: namespace_definition no longer wraps its own "DEFINE" keyword;
    // the outer definition_statement supplies it.
    namespace_definition: ($) => seq("NAMESPACE", $.namespace_body),
    namespace_body: ($) =>
      seq($.dotted_identifier, optional($.namespace_block)),
    namespace_block: ($) =>
      seq(
        "[",
        repeat(seq($.contained_definition, optional(choice(";", ",")))),
        "]",
      ),

    contained_definition: ($) =>
      choice(
        $.definition_item,
        seq(
          "SCHEMA",
          $.identifier,
          "[",
          repeat(seq($.contained_definition, optional(choice(";", ",")))),
          "]",
        ),
      ),

    field_definition: ($) => seq("FIELD", choice($.field_entry, $.field_batch)),
    field_entry: ($) =>
      seq(
        $.dotted_identifier,
        ":",
        $.type,
        repeat($.decorator),
        optional(seq("DEFAULT", $.expression)),
      ),
    field_batch: ($) => seq("[", commaSep1($.field_entry), "]"),

    enum_definition: ($) =>
      seq("ENUM", choice($.enum_entry_full, $.enum_batch)),
    enum_entry_full: ($) =>
      seq(
        $.dotted_identifier,
        optional(seq("<", $.primitive_type, ">")),
        $.enum_body,
      ),
    enum_body: ($) =>
      seq(
        "{",
        commaSep(seq($.dotted_identifier, optional(seq("=", $.literal)))),
        "}",
      ),
    enum_batch: ($) => seq("[", commaSep1($.enum_entry_full), "]"),

    struct_definition: ($) =>
      seq("STRUCT", $.dotted_identifier, "{", commaSep($.identifier), "}"),

    // v0.20: traits are first-class; EXTENDS and MetadataBlock now supported.
    // trait_body is extracted into its own named rule so the parser can fully
    // reduce it before attempting the optional metadata_block, resolving the
    // shift/reduce conflict that occurred with the braces inline.
    trait_definition: ($) =>
      seq(
        "TRAIT",
        $.dotted_identifier,
        optional($.extends_clause),
        $.trait_body,
        optional($.metadata_block),
      ),

    trait_body: ($) => seq("{", commaSep($.identifier), "}"),

    node_definition: ($) =>
      seq("NODE", choice($.node_entry_full, $.node_batch)),

    // v0.20: ABSTRACT NODE removed — optional("ABSTRACT") is gone
    node_entry_full: ($) =>
      seq(
        $.dotted_identifier,
        optional($.extends_clause),
        $.node_body,
        optional($.metadata_block),
      ),
    node_batch: ($) => seq("[", commaSep1($.node_entry_full), "]"),

    edge_definition: ($) =>
      seq("EDGE", choice($.edge_entry_full, $.edge_batch)),
    // optional("ABSTRACT") retained for batch forms: DEFINE EDGE [ ABSTRACT Foo {...} ]
    edge_entry_full: ($) =>
      seq(
        optional("ABSTRACT"),
        $.dotted_identifier,
        optional($.extends_clause),
        $.edge_body,
        optional($.metadata_block),
      ),
    edge_batch: ($) => seq("[", commaSep1($.edge_entry_full), "]"),

    // v0.20: DEFINE ROLE removed; roles are fully localized within DEFINE EDGE.
    // role_entry now carries an inline ALLOWS clause directly.
    role_entry: ($) =>
      seq(
        $.dotted_identifier,
        choice("<-", "->", "<->"),
        $.cardinality,
        optional(seq("ALLOWS", $.inline_allows_clause)),
      ),

    // v0.20: new rule — the ALLOWS clause for an inline role definition
    inline_allows_clause: ($) =>
      choice(
        // Single type, no constraint
        $.dotted_identifier,
        // Single type with constraint block
        seq($.dotted_identifier, $.role_body_constraint_block),
        // Multiple types, no per-type constraints
        seq("[", commaSep1($.dotted_identifier), "]"),
        // Multiple types with unified constraint block
        seq(
          "[",
          commaSep1($.dotted_identifier),
          "]",
          $.role_body_constraint_block,
        ),
        // Multiple types with individual per-type constraints
        seq(
          "[",
          commaSep1(seq($.dotted_identifier, $.role_body_constraint_block)),
          "]",
        ),
      ),

    // v0.20: new rule — named-only constraint block used inside role ALLOWS.
    // @deferred is FORBIDDEN on this block per error [1060].
    role_body_constraint_block: ($) =>
      seq("{", "constraints", ":", $.constraint_object, "}"),

    extends_clause: ($) =>
      seq(
        "EXTENDS",
        choice(
          $.dotted_identifier,
          seq("[", commaSep1($.dotted_identifier), "]"),
        ),
      ),

    node_body: ($) => seq("{", commaSep($.node_entry), "}"),
    node_entry: ($) => choice($.node_storage_entry, $.node_computed_entry),

    node_storage_entry: ($) =>
      seq($.dotted_identifier, optional(seq("DEFAULT", $.expression))),

    node_computed_entry: ($) =>
      seq(
        $.dotted_identifier,
        ":",
        $.type,
        repeat($.decorator),
        optional($.query_block),
      ),

    query_block: ($) =>
      seq("{", repeat1(seq($.query_clause, optional(";"))), "}"),

    edge_body: ($) => seq("{", commaSep($.edge_entry), "}"),
    edge_entry: ($) =>
      choice(
        $.node_entry, // field references
        $.role_entry, // localized role declarations
      ),

    cardinality: ($) =>
      seq(
        "(",
        choice($.number, "*", seq($.number, "..", choice($.number, "*"))),
        ")",
      ),

    metadata_block: ($) =>
      seq("{", commaSep(choice($.display_meta, $.constraints_meta)), "}"),
    display_meta: ($) => seq("display", ":", $.identifier),

    // v0.20: anonymous constraint array form removed; named object form only
    constraints_meta: ($) => seq("constraints", ":", $.constraint_object),

    constraint_object: ($) =>
      seq(
        "{",
        commaSep(seq($.identifier, ":", $.expression, optional($.decorator))),
        "}",
        optional($.decorator),
      ),

    function_definition: ($) =>
      seq(
        "FUNCTION",
        $.decorator, // purity decorator: @pure | @readonly | @nondeterministic
        $.identifier,
        "(",
        commaSep($.parameter),
        ")",
        ":",
        $.type,
        $.block,
      ),

    aggregate_function_definition: ($) =>
      seq(
        "AGGREGATE",
        "FUNCTION",
        $.decorator,
        $.identifier,
        "(",
        commaSep($.parameter),
        ")",
        ":",
        $.type,
        "{",
        $.state_clause,
        $.accumulate_clause,
        $.finalize_clause,
        "}",
      ),

    state_clause: ($) =>
      seq(
        "STATE",
        "[",
        commaSep(seq($.identifier, ":", $.type, "=", $.expression)),
        "]",
        ";",
      ),
    accumulate_clause: ($) =>
      seq(
        "ACCUMULATE",
        "[",
        commaSep(seq($.identifier, "=", $.expression)),
        "]",
        ";",
      ),
    finalize_clause: ($) => seq("FINALIZE", $.expression, ";"),

    index_definition: ($) =>
      seq("INDEX", choice($.index_entry_full, $.index_batch)),
    index_entry_full: ($) =>
      seq($.identifier, "ON", $.identifier, "(", commaSep1($.identifier), ")"),
    index_batch: ($) => seq("[", commaSep1($.index_entry_full), "]"),

    materialized_view_definition: ($) =>
      seq(
        "MATERIALIZED",
        "VIEW",
        $.identifier,
        "FOR",
        "[",
        commaSep1($.identifier),
        "]",
        "ON",
        "[",
        commaSep1($.identifier),
        "]",
        "INDEX",
        "[",
        commaSep1($.identifier),
        "]",
      ),

    // v0.20: new — named, reusable query fragment; expanded inline at plan time
    view_definition: ($) =>
      seq(
        "VIEW",
        $.dotted_identifier,
        optional(seq("(", commaSep($.view_parameter), ")")), // CHANGE: view_parameter
        "AS",
        repeat1($.query_clause),
      ),

    // v0.20: new — tagged union type for UDF return values
    union_definition: ($) =>
      seq("UNION", $.dotted_identifier, "{", commaSep1($.union_variant), "}"),

    // v0.20: new — one variant arm of a union type
    union_variant: ($) =>
      seq($.identifier, "{", commaSep($.dotted_identifier), "}"),

    schema_definition: ($) =>
      seq(
        "SCHEMA",
        $.identifier,
        "[",
        repeat(seq($.contained_definition, optional(choice(";", ",")))),
        "]",
      ),

    // -------------------------------------------------------------------------
    // Queries & Mutations (DML)
    // -------------------------------------------------------------------------

    query_statement: ($) => repeat1($.query_clause),

    query_clause: ($) =>
      choice(
        $.match_clause,
        $.match_from_clause, // v0.20: MATCH (var) FROM ViewName
        $.where_clause,
        $.with_clause,
        $.return_clause,
        $.union_clause,
      ),

    match_clause: ($) =>
      seq(
        optional("OPTIONAL"),
        "MATCH",
        choice(commaSep1($.pattern), seq("[", commaSep1($.pattern), "]")),
        optional("CROSS_TYPE"),
      ),

    // v0.20: MATCH (var) FROM ViewName — binds var to results of a named view.
    // Separated from match_clause to avoid LR conflict: after MATCH (id), the
    // parser needs one token of lookahead (FROM vs anything else) to decide.
    match_from_clause: ($) =>
      seq("MATCH", "(", $.identifier, ")", "FROM", $.dotted_identifier),

    // v0.20: FROM variant removed from pattern (now handled by match_from_clause)
    pattern: ($) =>
      choice(
        seq(
          "(",
          $.identifier,
          optional(seq(":", $.dotted_identifier)),
          optional($.pattern_object),
          ")",
        ),
        seq("PATH", $.identifier, "=", $.path_pattern),
      ),

    pattern_object: ($) =>
      seq("{", commaSep(choice($.pattern_prop, $.pattern_role)), "}"),
    pattern_prop: ($) =>
      seq($.dotted_identifier, choice(":", "="), $.expression),
    pattern_role: ($) => seq($.dotted_identifier, "=>", $.dotted_identifier),

    path_pattern: ($) =>
      seq(
        "(",
        $.identifier,
        ")",
        "-",
        "[",
        ":",
        $.dotted_identifier,
        "*",
        optional($.identifier),
        "]",
        "-",
        ">",
        "(",
        $.identifier,
        ")",
      ),

    where_clause: ($) =>
      seq(
        "WHERE",
        choice($.expression, seq("[", commaSep1($.expression), "]")),
      ),

    with_clause: ($) =>
      seq(
        "WITH",
        choice(commaSep1($.with_entry), seq("[", commaSep1($.with_entry), "]")),
      ),
    with_entry: ($) =>
      choice(
        seq($.expression, optional(seq("AS", $.identifier))),
        seq(
          $.dotted_identifier,
          "(",
          commaSep(choice($.identifier, seq($.identifier, ":", $.expression))),
          ")",
          "AS",
          $.identifier,
        ),
      ),

    return_clause: ($) =>
      seq(
        "RETURN",
        optional("DISTINCT"),
        choice(
          commaSep1($.return_entry),
          seq("[", commaSep1($.return_entry), "]"),
        ),
        optional($.group_by_clause),
        optional($.having_clause),
        optional($.order_by_clause),
        optional($.limit_clause),
        optional($.skip_clause),
      ),

    return_entry: ($) => seq($.expression, optional(seq("AS", $.identifier))),

    group_by_clause: ($) => seq("GROUP", "BY", commaSep1($.expression)),
    having_clause: ($) =>
      seq(
        "HAVING",
        choice($.expression, seq("[", commaSep1($.expression), "]")),
      ),
    order_by_clause: ($) => seq("ORDER", "BY", commaSep1($.order_entry)),
    order_entry: ($) =>
      seq(
        $.expression,
        optional(choice("ASC", "DESC")),
        optional(seq("NULLS", choice("FIRST", "LAST"))),
      ),
    limit_clause: ($) => seq("LIMIT", $.expression),
    skip_clause: ($) => seq("SKIP", $.expression),

    union_clause: ($) => seq("UNION", optional("ALL")),

    // v0.20: removed standalone ADD ROLE mutation (use ALTER EDGE instead)
    mutation_statement: ($) =>
      choice(
        seq("CREATE", $.create_body),
        $.mixed_create_batch,
        $.merge_statement,
        $.set_statement,
        $.delete_statement,
        $.alter_statement,
        $.drop_statement,
        $.migrate_statement,
        seq("GRANT", "ACCESS", "ROLE", $.identifier, "TO", $.identifier),
        seq("REVOKE", "ACCESS", "ROLE", $.identifier, "FROM", $.identifier),
      ),

    create_body: ($) => choice($.singular_create, $.same_type_create_batch),

    singular_create: ($) =>
      choice(
        seq("NODE", $.create_node_entry),
        seq("EDGE", $.create_edge_entry),
        seq(
          "USER",
          $.identifier,
          "WITH",
          "PASSWORD",
          $.string,
          optional(seq("ROLES", "[", commaSep($.identifier), "]")),
        ),
      ),

    same_type_create_batch: ($) =>
      choice(
        seq("NODE", $.create_node_batch),
        seq("EDGE", $.create_edge_batch),
      ),

    mixed_create_batch: ($) => seq("CREATE", "[", commaSep($.create_item), "]"),

    create_item: ($) =>
      choice(
        seq("NODE", choice($.create_node_entry, $.create_node_batch)),
        seq("EDGE", choice($.create_edge_entry, $.create_edge_batch)),
      ),

    create_node_entry: ($) =>
      seq($.identifier, ":", $.dotted_identifier, $.create_body_block),
    create_edge_entry: ($) =>
      seq($.identifier, ":", $.dotted_identifier, $.create_body_block),
    create_node_batch: ($) => seq("[", commaSep1($.create_node_entry), "]"),
    create_edge_batch: ($) => seq("[", commaSep1($.create_edge_entry), "]"),

    create_body_block: ($) => seq("{", commaSep($.create_assignment), "}"),
    create_assignment: ($) =>
      choice(
        seq($.dotted_identifier, "=", $.expression),
        seq($.dotted_identifier, "=>", $.dotted_identifier),
      ),

    merge_statement: ($) =>
      choice(
        seq(
          "MERGE",
          "(",
          $.identifier,
          ":",
          $.identifier,
          $.pattern_object,
          ")",
          repeat($.merge_action),
        ),
        seq("MERGE", "OBJECT", $.identifier, "WITH", $.parameter_ref),
      ),
    merge_action: ($) =>
      seq("ON", choice("CREATE", "MATCH"), "SET", $.set_assignments),

    set_statement: ($) =>
      seq(
        "SET",
        choice(
          $.set_assignments,
          $.set_isolation,
          seq("CONSTRAINT", "LIMIT", $.identifier, "=", $.expression),
          seq("UDF", "LIMIT", $.identifier, "=", $.expression),
          seq("STRICT_PERMISSIONS", choice("ON", "OFF")),
        ),
      ),
    set_assignments: ($) => commaSep1($.set_assignment),
    set_assignment: ($) =>
      choice(
        seq($.identifier, choice("=", "+="), $.expression),
        seq($.member_access, choice("=", "+=", "-="), $.expression),
      ),

    delete_statement: ($) =>
      seq(optional("DETACH"), "DELETE", commaSep1($.identifier)),

    // -------------------------------------------------------------------------
    // ALTER ops
    // -------------------------------------------------------------------------

    alter_field_entry: ($) => seq($.dotted_identifier, $.alter_field_ops),

    alter_field_ops: ($) =>
      choice($.alter_field_op, seq("[", commaSep($.alter_field_op), "]")),

    alter_field_op: ($) =>
      choice(
        seq("SET", "TYPE", $.type),
        seq("ADD", $.decorator),
        seq("DROP", $.decorator),
        seq("SET", "DEFAULT", $.expression),
        seq("DROP", "DEFAULT"),
      ),

    alter_statement: ($) =>
      seq(
        "ALTER",
        choice(
          seq(
            "NODE",
            choice(
              seq($.dotted_identifier, $.alter_ops),
              seq("[", commaSep1(seq($.dotted_identifier, $.alter_ops)), "]"),
            ),
          ),
          seq(
            "EDGE",
            choice(
              seq($.dotted_identifier, $.alter_ops),
              seq("[", commaSep1(seq($.dotted_identifier, $.alter_ops)), "]"),
            ),
          ),
          seq(
            "FIELD",
            choice(
              $.alter_field_entry,
              seq("[", commaSep1($.alter_field_entry), "]"),
            ),
          ),
          $.bulk_alter_block,
          seq("SCHEMA", $.identifier, "[", repeat($.alter_schema_entry), "]"),
          seq(
            "USER",
            $.identifier,
            choice(
              seq("SET", "PASSWORD", $.string),
              seq("ADD", "ROLES", "[", commaSep($.identifier), "]"),
              seq("REMOVE", "ROLES", "[", commaSep($.identifier), "]"),
            ),
          ),
          seq(
            "NAMESPACE",
            $.dotted_identifier,
            "SET",
            "STRICT_PERMISSIONS",
            choice("ON", "OFF"),
          ),
        ),
      ),

    alter_ops: ($) =>
      choice($.alter_entry, seq("[", commaSep($.alter_entry), "]")),

    bulk_alter_block: ($) =>
      seq(
        "[",
        commaSep1(
          choice(
            seq(
              "NODE",
              choice(
                seq($.dotted_identifier, $.alter_ops),
                seq("[", commaSep1(seq($.dotted_identifier, $.alter_ops)), "]"),
              ),
            ),
            seq(
              "EDGE",
              choice(
                seq($.dotted_identifier, $.alter_ops),
                seq("[", commaSep1(seq($.dotted_identifier, $.alter_ops)), "]"),
              ),
            ),
            seq(
              "FIELD",
              choice(
                $.alter_field_entry,
                seq("[", commaSep1($.alter_field_entry), "]"),
              ),
            ),
          ),
        ),
        "]",
      ),

    alter_entry: ($) =>
      choice(
        seq("ADD", $.dotted_identifier, repeat($.decorator)),
        seq("DROP", $.dotted_identifier),
        seq("RENAME", $.dotted_identifier, "TO", $.dotted_identifier),
        seq("ADD", "CONSTRAINT", $.identifier, ":", $.expression),
        seq("DROP", "CONSTRAINT", $.identifier),
        seq(
          "ADD",
          "ROLE",
          choice($.role_entry, seq("[", commaSep1($.role_entry), "]")),
        ),
        seq(
          "DROP",
          "ROLE",
          choice($.identifier, seq("[", commaSep1($.identifier), "]")),
        ),
      ),

    alter_schema_entry: ($) =>
      seq(
        choice("ADD", "DROP", "RENAME"),
        $.identifier,
        optional(seq("TO", $.identifier)),
      ),

    // v0.20: removed top-level ROLE drop; added VIEW and MATERIALIZED VIEW drops
    drop_statement: ($) =>
      seq(
        "DROP",
        choice(
          seq(
            choice("USER", "SCHEMA", "NODE", "EDGE", "FIELD", "PREPARE"),
            $.identifier,
          ),
          seq("VIEW", $.dotted_identifier),
          seq("MATERIALIZED", "VIEW", $.dotted_identifier),
        ),
      ),

    migrate_statement: ($) =>
      choice(
        seq(
          "MIGRATE",
          $.identifier,
          "TO",
          $.identifier,
          optional(seq("MAP", $.object_literal)),
          optional(seq("DEFAULTS", $.object_literal)),
        ),
        seq(
          "VALIDATE",
          "MIGRATION",
          $.identifier,
          "TO",
          $.identifier,
          optional(seq("MAP", $.object_literal)),
          optional(seq("DEFAULTS", $.object_literal)),
        ),
      ),

    // -------------------------------------------------------------------------
    // Transactions
    // -------------------------------------------------------------------------

    transaction_statement: ($) =>
      seq(
        choice("BEGIN", "COMMIT", "ROLLBACK"),
        optional(seq("ISOLATION", "LEVEL", $.identifier)),
        optional(seq("ON", "ERROR", "CONTINUE")),
      ),

    set_isolation: ($) => seq("ISOLATION", "LEVEL", $.identifier),

    // -------------------------------------------------------------------------
    // Imports
    // -------------------------------------------------------------------------

    import_statement: ($) =>
      seq(
        "IMPORT",
        choice(
          seq($.identifier, repeat(seq(".", $.identifier))),
          seq(
            "SCHEMA",
            $.identifier,
            "FROM",
            $.identifier,
            repeat(seq(".", $.identifier)),
          ),
          seq($.string, "AS", $.identifier),
        ),
      ),

    // -------------------------------------------------------------------------
    // Introspection
    // v0.20: added SHOW NODE TYPES, SHOW EDGE TYPES, SHOW TRAITS/TRAIT,
    // SHOW VIEWS/VIEW, SHOW FUNCTIONS/FUNCTION, SHOW FIELDS, SHOW SCHEMA,
    // SHOW MATERIALIZED VIEWS; VALIDATE VIEW/CONSTRAINT/MATERIALIZED VIEW;
    // REBUILD MATERIALIZED VIEW. EXPLAIN/ANALYZE promoted to top-level
    // statement types to avoid the EX- prefix conflict with EXECUTE.
    // TRAIT/VIEW/FUNCTION use optional($.dotted_identifier) instead of
    // separate TRAITS/TRAIT alternatives to prevent the lexer from
    // prefix-matching TRAIT inside TRAITS (which would leave S unparsed).
    // -------------------------------------------------------------------------

    introspection_statement: ($) =>
      choice(
        seq(
          "SHOW",
          choice(
            seq("ACCESS", "POLICIES", "ON", $.identifier),
            seq("ACCESS", "ROLES"),
            seq(
              "EFFECTIVE",
              "PERMISSIONS",
              "FOR",
              $.identifier,
              "ON",
              "NAMESPACE",
              $.dotted_identifier,
            ),
            seq("PERMISSIONS", "FOR", $.identifier),
            seq("PREPARED", "STATEMENTS"),
            seq("NODE", "TYPES"),
            seq("EDGE", "TYPES"),

            // THE FIX: Now that word boundaries work, we can safely use the
            // plural keywords for listing all, and singular for specific targets.
            choice("TRAITS", seq("TRAIT", $.dotted_identifier)),
            choice("VIEWS", seq("VIEW", $.dotted_identifier)),
            choice("FUNCTIONS", seq("FUNCTION", $.dotted_identifier)),

            "FIELDS",
            "SCHEMA",
            seq("MATERIALIZED", "VIEWS"),
            seq(
              choice("NAMESPACE", "SCHEMA", "FIELD", "NODE", "EDGE"),
              $.dotted_identifier,
            ),
            "USERS",
          ),
        ),
        seq("VALIDATE", "SCHEMA", $.identifier),
        seq("VALIDATE", "VIEW", $.dotted_identifier),
        seq("VALIDATE", "CONSTRAINT", $.dotted_identifier),
        seq("VALIDATE", "MATERIALIZED", "VIEW", $.dotted_identifier),
        seq("REBUILD", "MATERIALIZED", "VIEW", $.dotted_identifier),
      ),

    // -------------------------------------------------------------------------
    // Security
    // -------------------------------------------------------------------------

    // v0.20: optional STRICT_PERMISSIONS modifier on access role definitions
    access_role_definition: ($) =>
      seq(
        "ACCESS",
        "ROLE",
        $.identifier,
        optional("STRICT_PERMISSIONS"),
        "[",
        commaSep1($.access_entry), // <-- CHANGED from repeat()
        "]",
      ),

    access_entry: ($) =>
      seq(
        choice("GRANT", "DENY"),
        choice("NAMESPACE", "NODE", "EDGE", "FIELD"),
        $.dotted_identifier,
        "PERMISSIONS",
        "[",
        commaSep($.identifier),
        "]",
        optional(choice("CASCADE", seq("NO", "CASCADE"))),
      ),

    access_policy_definition: ($) =>
      seq(
        "ACCESS",
        "POLICY",
        $.identifier,
        "ON",
        choice("NAMESPACE", "NODE", "EDGE", "FIELD"), // e.g., NODE
        $.dotted_identifier, // e.g., Employee
        "FOR",
        choice(
          $.identifier, // e.g., READ
          seq("[", commaSep1($.identifier), "]"), // e.g., [READ, WRITE]
        ),
        "USING",
        "(",
        $.expression,
        ")",
      ),

    // v0.20: PERSISTENT removed — all prepared statements are session-scoped
    prepare_statement: ($) =>
      seq("PREPARE", $.identifier, "AS", $.query_statement),

    execute_statement: ($) =>
      seq("EXECUTE", $.identifier, optional(seq("WITH", $.object_literal))),

    // v0.20: EXPLAIN and ANALYZE promoted from introspection_statement to
    // top-level statement types. This avoids the EX- prefix conflict where
    // tree-sitter would partially match EXECUTE when it saw EXPLAIN, consuming
    // E-X and then failing on P (third character of EXPLAIN vs EXECUTE).
    explain_statement: ($) =>
      choice(
        seq(
          "EXPLAIN",
          optional(choice("VERBOSE", "JSON")),
          repeat1($.query_clause),
        ),
        seq("EXPLAIN", "CONSTRAINT", $.dotted_identifier),
        seq(
          "EXPLAIN",
          "FUNCTION",
          $.identifier,
          "(",
          commaSep($.expression),
          ")",
        ),
      ),

    analyze_statement: ($) =>
      choice(
        seq(
          "ANALYZE",
          optional(choice("VERBOSE", "JSON")),
          repeat1($.query_clause),
        ),
        seq("ANALYZE", "CONSTRAINT", $.dotted_identifier),
      ),

    // -------------------------------------------------------------------------
    // Expressions
    // -------------------------------------------------------------------------

    expression: ($) =>
      choice(
        $.conditional_expression,
        $.binary_expression,
        $.unary_expression,
        $.primary_expression,
      ),

    binary_expression: ($) =>
      choice(
        ...[
          ["||", 20],
          ["OR", 20],
          ["&&", 30],
          ["AND", 30],
          ["==", 40],
          ["!=", 40],
          ["<", 50],
          [">", 50],
          ["<=", 50],
          [">=", 50],
          ["IN", 50],
          ["|", 55],
          ["&", 55],
          ["+", 60],
          ["-", 60],
          ["*", 70],
          ["/", 70],
          ["%", 70],
          ["??", 75],
          ["LIKE", 50],
          ["ILIKE", 50],
          ["MATCHES", 50],
          ["IMATCHES", 50],
        ].map(([operator, precedence]) =>
          prec.left(precedence, seq($.expression, operator, $.expression)),
        ),
      ),

    unary_expression: ($) =>
      choice(
        prec(80, seq(choice("!", "-", "~", "NOT"), $.expression)),
        prec(10, seq($.expression, "IS", optional("NOT"), "NULL")),
      ),

    primary_expression: ($) =>
      choice(
        $.literal,
        $.identifier,
        $.member_access,
        $.index_access,
        $.list_literal,
        $.object_literal,
        $.window_call,
        $.function_call,
        $.subquery_expression,
        $.parameter_ref,
        $.enum_shorthand,
        seq("(", $.expression, ")"),
      ),

    index_access: ($) =>
      prec.left(110, seq($.expression, "[", $.expression, "]")),

    list_literal: ($) => seq("[", commaSep($.expression), "]"),

    window_call: ($) =>
      seq(
        $.dotted_identifier,
        "(",
        commaSep($.expression),
        ")",
        "OVER",
        "(",
        optional($.window_spec),
        ")",
      ),

    window_spec: ($) =>
      choice(
        seq(
          $.partition_by_clause,
          optional($.order_by_clause),
          optional($.window_frame),
        ),
        seq($.order_by_clause, optional($.window_frame)),
        $.window_frame,
      ),

    partition_by_clause: ($) => seq("PARTITION", "BY", commaSep1($.expression)),

    window_frame: ($) =>
      seq(
        choice("ROWS", "RANGE"),
        choice(
          seq("BETWEEN", $.frame_bound, "AND", $.frame_bound),
          $.frame_bound,
        ),
      ),

    frame_bound: ($) =>
      choice(
        seq("CURRENT", "ROW"),
        seq("UNBOUNDED", choice("PRECEDING", "FOLLOWING")),
        seq($.expression, choice("PRECEDING", "FOLLOWING")),
      ),

    conditional_expression: ($) =>
      choice($.if_expression, $.case_expression, $.match_expression),

    if_expression: ($) =>
      seq("IF", $.expression, "THEN", $.expression, "ELSE", $.expression),

    case_expression: ($) =>
      seq(
        "CASE",
        optional($.expression),
        repeat1(seq("WHEN", $.expression, "THEN", $.expression)),
        optional(seq("ELSE", $.expression)),
        "END",
      ),

    match_expression: ($) =>
      seq(
        "MATCH",
        $.expression,
        "{",
        commaSep1(seq($.expression, "=>", $.expression)),
        "}",
      ),

    subquery_expression: ($) =>
      seq(
        choice("EXISTS", seq($.expression, "IN")),
        "(",
        repeat1($.query_clause),
        optional(";"),
        ")",
      ),

    member_access: ($) =>
      choice(
        prec.left(100, seq($.expression, choice(".", "?."), $.identifier)),
        prec.left(100, seq("this", ".", $.identifier)),
      ),

    function_call: ($) =>
      prec(
        90,
        seq(
          $.dotted_identifier, // Changed from $.identifier
          "(",
          choice(alias("*", $.star_arg), commaSep($.expression)),
          ")",
        ),
      ),

    parameter_ref: ($) => seq("$", $.identifier, optional(seq(":", $.type))),

    enum_shorthand: ($) => seq(".", $.identifier),

    // -------------------------------------------------------------------------
    // Scripting / Blocks
    // -------------------------------------------------------------------------

    block: ($) => seq("{", repeat($.script_statement), "}"),
    script_statement: ($) =>
      choice(
        $.var_decl,
        $.const_decl,
        $.while_stmt,
        $.for_in_stmt,
        $.if_else_stmt,
        $.return_stmt,
        $.assign_stmt,
        $.break_stmt,
        $.continue_stmt,
        seq($.expression, ";"),
      ),

    var_decl: ($) =>
      seq(
        "VAR",
        $.identifier,
        optional(seq(":", $.type)),
        optional(seq("=", $.expression)),
        ";",
      ),
    const_decl: ($) =>
      seq(
        "CONST",
        $.identifier,
        optional(seq(":", $.type)),
        "=",
        $.expression,
        ";",
      ),
    while_stmt: ($) => seq("WHILE", "(", $.expression, ")", $.block),
    for_in_stmt: ($) =>
      seq("FOR", "(", $.identifier, "IN", $.expression, ")", $.block),
    if_else_stmt: ($) =>
      seq(
        "IF",
        "(",
        $.expression,
        ")",
        $.block,
        optional(seq("ELSE", $.block)),
      ),
    return_stmt: ($) => seq("RETURN", $.expression, ";"),
    assign_stmt: ($) => seq($.identifier, "=", $.expression, ";"),
    break_stmt: ($) => seq("BREAK", ";"),
    continue_stmt: ($) => seq("CONTINUE", ";"),

    // -------------------------------------------------------------------------
    // Basic Tokens
    // -------------------------------------------------------------------------

    identifier: ($) => /[a-zA-Z_][a-zA-Z0-9_]*/,
    dotted_identifier: ($) => seq($.identifier, repeat(seq(".", $.identifier))),

    type: ($) =>
      seq(
        $.dotted_identifier,
        optional(
          choice(
            seq("<", commaSep1($.type), ">"), // generic type params: Array<String>
            seq("(", commaSep1($.number), ")"), // precision params: Decimal(15,8)
          ),
        ),
        optional("?"),
      ),

    primitive_type: ($) =>
      choice(
        "INT",
        "FLOAT",
        "STRING",
        "BOOL",
        "DATE",
        "UUID",
        "DECIMAL",
        "FLAGS",
      ),

    // FIX (retained from v0.19): restrict continuation chars to [a-z0-9_] so
    // the pattern stops at uppercase letters, preventing swallowing of keywords
    // that follow a decorator (e.g. `@requiredDEFAULT` would be one token with
    // the original pattern). Decorator names in HyperQL are all-lowercase.
    decorator: ($) =>
      seq(
        /@[a-zA-Z_][a-z0-9_]*/,
        optional(seq("(", commaSep($.expression), ")")),
      ),

    literal: ($) => choice($.string, $.number, $.boolean, "null"),

    string: ($) =>
      seq('"', repeat(choice($._string_content, $.escape_sequence)), '"'),
    number: ($) => /-?\d+(\.\d+)?d?/,
    boolean: ($) => choice("true", "false"),

    _string_content: ($) => /[^"\\]+/,
    escape_sequence: ($) => /\\./,

    // v0.20: block comments /* */ are the ONLY supported comment form.
    // Line comments (//) are not supported. An unterminated /* is [1001].
    comment: ($) => token(seq("/*", /[^*]*\*+([^/*][^*]*\*+)*/, "/")),

    parameter: ($) => seq($.identifier, ":", $.type),
    view_parameter: ($) => seq("$", $.identifier, ":", $.type),

    object_literal: ($) =>
      seq(
        "{",
        commaSep(seq($.identifier, choice(":", "="), $.expression)),
        "}",
      ),
  },
});

function commaSep(rule) {
  return optional(commaSep1(rule));
}

function commaSep1(rule) {
  return seq(rule, repeat(seq(",", rule)), optional(","));
}

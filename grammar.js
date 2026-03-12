module.exports = grammar({
  name: "hyperql",

  extras: ($) => [/\s/, $.comment],

  word: ($) => $.identifier,

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
    [$.role_allows_list],
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
    [$.with_entry, $.primary_expression],
    [$.with_entry, $.function_call],
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
        ),
        ";",
      ),

    // --- Definitions (SDL) ---
    definition_statement: ($) =>
      choice(
        seq(repeat(choice("DEFINE", "ABSTRACT")), $.definition_body),
        $.mixed_definition_batch,
      ),

    definition_body: ($) =>
      choice(
        $.namespace_definition,
        $.field_definition,
        $.enum_definition,
        $.struct_definition,
        $.trait_definition,
        $.role_definition,
        $.node_definition,
        $.edge_definition,
        $.function_definition,
        $.aggregate_function_definition,
        $.index_definition,
        $.materialized_view_definition,
        $.access_role_definition,
        $.access_policy_definition,
        $.schema_definition,
      ),

    mixed_definition_batch: ($) =>
      seq("DEFINE", "[", commaSep($.definition_item), "]"),

    definition_item: ($) =>
      choice(
        seq("NAMESPACE", $.namespace_body),
        seq("FIELD", choice($.field_entry, $.field_batch)),
        seq("STRUCT", $.identifier, "{", commaSep($.identifier), "}"),
        seq("TRAIT", $.identifier, "{", commaSep($.identifier), "}"),
        seq(optional("ABSTRACT"), "NODE", choice($.node_entry_full, $.node_batch)),
        seq(optional("ABSTRACT"), "EDGE", choice($.edge_entry_full, $.edge_batch)),
        seq("ENUM", choice($.enum_entry_full, $.enum_batch)),
        seq("ROLE", choice($.role_entry_full, $.role_batch)),
        seq("INDEX", choice($.index_entry_full, $.index_batch)),
      ),

    namespace_definition: ($) => seq("NAMESPACE", $.namespace_body),
    namespace_body: ($) =>
      seq($.dotted_identifier, optional($.namespace_block)),
    namespace_block: ($) =>
      seq("[", repeat(seq($.contained_definition, optional(choice(";", ",")))), "]"),

    contained_definition: ($) =>
      choice(
        $.definition_item,
        seq("SCHEMA", $.identifier, "[", repeat(seq($.contained_definition, optional(choice(";", ",")))), "]"),
      ),

    field_definition: ($) => seq("FIELD", choice($.field_entry, $.field_batch)),
    field_entry: ($) =>
      seq(
        $.identifier,
        ":",
        $.type,
        repeat($.decorator),
        optional(seq("DEFAULT", $.expression)),
      ),
    field_batch: ($) => seq("[", commaSep1($.field_entry), "]"),

    enum_definition: ($) => seq("ENUM", choice($.enum_entry_full, $.enum_batch)),
    enum_entry_full: ($) =>
      seq($.identifier, optional(seq("<", $.primitive_type, ">")), $.enum_body),
    enum_body: ($) =>
      seq("{", commaSep(seq($.identifier, optional(seq("=", $.literal)))), "}"),
    enum_batch: ($) => seq("[", commaSep1($.enum_entry_full), "]"),

    struct_definition: ($) =>
      seq("STRUCT", $.identifier, "{", commaSep($.identifier), "}"),

    trait_definition: ($) =>
      seq("TRAIT", $.identifier, "{", commaSep($.identifier), "}"),

    node_definition: ($) => seq("NODE", choice($.node_entry_full, $.node_batch)),
    node_entry_full: ($) =>
      seq(
        optional("ABSTRACT"),
        $.identifier,
        optional($.extends_clause),
        $.node_body,
        optional($.metadata_block),
      ),
    node_batch: ($) => seq("[", commaSep1($.node_entry_full), "]"),

    edge_definition: ($) => seq("EDGE", choice($.edge_entry_full, $.edge_batch)),
    edge_entry_full: ($) =>
      seq(
        optional("ABSTRACT"),
        $.identifier,
        optional($.extends_clause),
        $.edge_body,
        optional($.metadata_block),
      ),
    edge_batch: ($) => seq("[", commaSep1($.edge_entry_full), "]"),

    role_definition: ($) =>
      seq("ROLE", choice($.role_entry_full, $.role_batch)),
    role_entry_full: ($) => seq($.identifier, "ALLOWS", $.role_allows_list),
    role_batch: ($) => seq("[", commaSep1($.role_entry_full), "]"),

    role_allows_list: ($) =>
      choice(
        // Singular, no constraint
        $.identifier,
        // Singular, with constraint
        seq($.identifier, ":", $.role_constraint_block),
        // Batch, no constraint
        seq("[", commaSep($.identifier), "]"),
        // Batch, unified constraint
        seq("[", commaSep1($.identifier), "]", ":", $.role_constraint_block),
        // Batch, type-specific constraints
        seq(
          "[",
          commaSep1(seq($.identifier, ":", $.role_constraint_block)),
          "]",
        ),
      ),

    role_constraint_block: ($) => seq("{", commaSep($.expression), "}"),

    extends_clause: ($) =>
      seq(
        "EXTENDS",
        choice($.identifier, seq("[", commaSep1($.identifier), "]")),
      ),

    node_body: ($) => seq("{", commaSep($.node_entry), "}"),
    node_entry: ($) => choice($.node_storage_entry, $.node_computed_entry),

    node_storage_entry: ($) =>
      seq($.identifier, optional(seq("DEFAULT", $.expression))),

    node_computed_entry: ($) =>
      seq(
        $.identifier,
        ":",
        $.type,
        repeat($.decorator),
        optional($.query_block),
      ),

    query_block: ($) => seq("{", repeat1($.query_clause), "}"),

    edge_body: ($) => seq("{", commaSep($.edge_entry), "}"),
    edge_entry: ($) =>
      choice(
        $.node_entry, // fields
        $.role_entry,
      ),

    role_entry: ($) =>
      seq($.identifier, choice("<-", "->", "<->"), $.cardinality),

    cardinality: ($) =>
      seq(
        "(",
        choice($.number, "*", seq($.number, "..", choice($.number, "*"))),
        ")",
      ),

    metadata_block: ($) =>
      seq("{", commaSep(choice($.display_meta, $.constraints_meta)), "}"),
    display_meta: ($) => seq("display", ":", $.identifier),

    constraints_meta: ($) =>
      seq("constraints", ":", choice($.constraint_array, $.constraint_object)),

    constraint_array: ($) => seq("[", commaSep($.expression), "]"),

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
        $.decorator, // purity
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
        $.decorator, // purity
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

    schema_definition: ($) =>
      seq("SCHEMA", $.identifier, "[", repeat(seq($.contained_definition, optional(choice(";", ",")))), "]"),

    // --- Queries & Mutations (DML) ---
    query_statement: ($) => repeat1($.query_clause),

    query_clause: ($) =>
      choice(
        $.match_clause,
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

    pattern: ($) =>
      choice(
        seq(
          "(",
          $.identifier,
          optional(seq(":", $.identifier)),
          optional($.pattern_object),
          ")",
        ),
        seq("PATH", $.identifier, "=", $.path_pattern),
      ),

    pattern_object: ($) =>
      seq("{", commaSep(choice($.pattern_prop, $.pattern_role)), "}"),
    pattern_prop: ($) => seq($.identifier, choice(":", "="), $.expression),
    pattern_role: ($) => seq($.identifier, "=>", $.identifier),

    path_pattern: ($) =>
      seq(
        "(",
        $.identifier,
        ")",
        "-",
        "[",
        ":",
        $.identifier,
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
        seq($.identifier, "(", commaSep(choice($.identifier, seq($.identifier, ":", $.expression))), ")", "AS", $.identifier),
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
        seq("ADD", "ROLE", choice($.role_entry, seq("[", commaSep1($.role_entry), "]"))),
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

    create_node_entry: ($) => seq($.identifier, ":", $.identifier, $.create_body_block),
    create_edge_entry: ($) => seq($.identifier, ":", $.identifier, $.create_body_block),
    create_node_batch: ($) => seq("[", commaSep1($.create_node_entry), "]"),
    create_edge_batch: ($) => seq("[", commaSep1($.create_edge_entry), "]"),

    create_body_block: ($) => seq("{", commaSep($.create_assignment), "}"),
    create_assignment: ($) =>
      choice(
        seq($.identifier, "=", $.expression),
        seq($.identifier, "=>", $.identifier),
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

    // --- ALTER FIELD ops ---
    alter_field_entry: ($) => seq($.identifier, $.alter_field_ops),

    alter_field_ops: ($) =>
      choice(
        $.alter_field_op, // Level 1: single op
        seq("[", commaSep($.alter_field_op), "]"), // Level 2: batch ops
      ),

    alter_field_op: ($) =>
      choice(
        seq("SET", "TYPE", $.type),
        seq("ADD", $.decorator),
        seq("DROP", $.decorator),
        seq("SET", "DEFAULT", $.expression),
        seq("DROP", "DEFAULT"),
      ),

    // --- ALTER ROLE ops ---
    alter_role_entry: ($) => seq($.identifier, $.alter_role_ops),

    alter_role_ops: ($) =>
      choice(
        $.alter_role_op, // Level 1: single op
        seq("[", commaSep($.alter_role_op), "]"), // Level 2: batch ops
      ),

    alter_role_op: ($) =>
      choice(
        seq("ADD", "ALLOWS", $.identifier, optional($.role_constraint_block)),
        seq("DROP", "ALLOWS", $.identifier),
        seq(
          "ADD",
          "CONSTRAINT",
          optional(seq($.identifier, ":")),
          $.expression,
        ),
        seq("DROP", "CONSTRAINT", $.identifier),
      ),

    alter_statement: ($) =>
      seq(
        "ALTER",
        choice(
          // NODE — levels 1 & 2
          seq(
            "NODE",
            choice(
              seq($.identifier, $.alter_ops),
              seq("[", commaSep1(seq($.identifier, $.alter_ops)), "]"),
            ),
          ),
          // EDGE — levels 1 & 2
          seq(
            "EDGE",
            choice(
              seq($.identifier, $.alter_ops),
              seq("[", commaSep1(seq($.identifier, $.alter_ops)), "]"),
            ),
          ),
          // FIELD — levels 1 & 2
          seq(
            "FIELD",
            choice(
              $.alter_field_entry,
              seq("[", commaSep1($.alter_field_entry), "]"),
            ),
          ),
          // ROLE — levels 1 & 2
          seq(
            "ROLE",
            choice(
              $.alter_role_entry,
              seq("[", commaSep1($.alter_role_entry), "]"),
            ),
          ),
          // Level 4 bulk mixed
          $.bulk_alter_block,
          // Non-type-hierarchy forms
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
      choice(
        $.alter_entry, // Level 1: ALTER NODE Person ADD field
        seq("[", commaSep($.alter_entry), "]"), // Level 2: ALTER NODE Person [ ADD x, DROP y ]
      ),

    bulk_alter_block: ($) =>
      seq(
        "[",
        commaSep1(
          choice(
            seq(
              "NODE",
              choice(
                seq($.identifier, $.alter_ops),
                seq("[", commaSep1(seq($.identifier, $.alter_ops)), "]"),
              ),
            ),
            seq(
              "EDGE",
              choice(
                seq($.identifier, $.alter_ops),
                seq("[", commaSep1(seq($.identifier, $.alter_ops)), "]"),
              ),
            ),
            seq(
              "FIELD",
              choice(
                $.alter_field_entry,
                seq("[", commaSep1($.alter_field_entry), "]"),
              ),
            ),
            seq(
              "ROLE",
              choice(
                $.alter_role_entry,
                seq("[", commaSep1($.alter_role_entry), "]"),
              ),
            ),
          ),
        ),
        "]",
      ),

    alter_entry: ($) =>
      choice(
        seq("ADD", $.identifier, repeat($.decorator)),
        seq("DROP", $.identifier),
        seq("RENAME", $.identifier, "TO", $.identifier),
        seq(
          "ADD",
          "CONSTRAINT",
          optional(seq($.identifier, ":")),
          $.expression,
        ),
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

    drop_statement: ($) =>
      seq(
        "DROP",
        choice(
          "USER",
          "SCHEMA",
          "NODE",
          "EDGE",
          "FIELD",
          "PREPARE",
          seq("ROLE", choice($.identifier, seq("[", commaSep1($.identifier), "]"))),
        ),
        optional($.identifier),
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

    // --- Transactions ---
    transaction_statement: ($) =>
      seq(
        choice("BEGIN", "COMMIT", "ROLLBACK"),
        optional(seq("ISOLATION", "LEVEL", $.identifier)),
        optional(seq("ON", "ERROR", "CONTINUE")),
      ),

    set_isolation: ($) => seq("ISOLATION", "LEVEL", $.identifier),

    // --- Imports ---
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

    // --- Introspection ---
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
            seq(
              choice("NAMESPACE", "SCHEMA", "FIELD", "NODE", "EDGE", "ROLE"),
              $.dotted_identifier,
            ),
            "USERS",
          ),
        ),
        seq("VALIDATE", "SCHEMA", $.identifier),
      ),

    // --- Security ---
    access_role_definition: ($) =>
      seq("ACCESS", "ROLE", $.identifier, "[", repeat($.access_entry), "]"),
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
        $.identifier,
        "FOR",
        "ACCESS",
        "ROLE",
        $.identifier,
        "USING",
        "(",
        $.expression,
        ")",
      ),

    prepare_statement: ($) =>
      seq(
        "PREPARE",
        optional("PERSISTENT"),
        $.identifier,
        "AS",
        $.query_statement,
      ),

    execute_statement: ($) =>
      seq("EXECUTE", $.identifier, optional(seq("WITH", $.object_literal))),

    // --- Expressions ---
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
          ["&&", 30],
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
        prec(80, seq(choice("!", "-", "~"), $.expression)),
        prec(10, seq($.expression, "IS", optional("NOT"), "NULL")),
      ),

    primary_expression: ($) =>
      choice(
        $.literal,
        $.identifier,
        $.member_access,
        $.index_access,
        $.list_literal,
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
        $.identifier,
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
        "CURRENT ROW",
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
        seq($.identifier, "(", choice(alias("*", $.star_arg), commaSep($.expression)), ")"),
      ),

    parameter_ref: ($) => seq("$", $.identifier, optional(seq(":", $.type))),

    enum_shorthand: ($) => seq(".", $.identifier),

    // --- Scripting / Blocks ---
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

    // --- Basic Tokens ---
    identifier: ($) => /[a-zA-Z_][a-zA-Z0-9_]*/,
    dotted_identifier: ($) => seq($.identifier, repeat(seq(".", $.identifier))),

    type: ($) =>
      seq(
        $.identifier,
        optional(seq("<", commaSep1($.type), ">")),
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

    decorator: ($) =>
      seq(
        /@[a-zA-Z_][a-zA-Z0-9_]*/,
        optional(seq("(", commaSep($.expression), ")")),
      ),

    literal: ($) => choice($.string, $.number, $.boolean, "null"),

    string: ($) => /"([^"\\]|\\.)*"/,
    number: ($) => /-?\d+(\.\d+)?d?/,
    boolean: ($) => choice("true", "false"),

    comment: ($) => /--.*/,

    parameter: ($) => seq($.identifier, ":", $.type),

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

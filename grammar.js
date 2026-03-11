module.exports = grammar({
  name: 'hyperql',

  extras: $ => [
    /\s/,
    $.comment
  ],

  word: $ => $.identifier,

  conflicts: $ => [
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
    [$.array_constraints],
    [$.object_constraints],
    [$.state_clause],
    [$.accumulate_clause],
    [$.index_definition],
    [$.batch_definition],
    [$.access_entry],
    [$.match_expression],
    [$.function_call],
    [$.create_statement],
    [$.binary_expression, $.subquery_expression],
    [$.type],
    [$.pattern, $.primary_expression]
  ],

  rules: {
    source_file: $ => repeat($.statement),

    statement: $ => seq(
      choice(
        $.definition_statement,
        $.query_statement,
        $.mutation_statement,
        $.transaction_statement,
        $.import_statement,
        $.introspection_statement
      ),
      ';'
    ),

    // --- Definitions (SDL) ---
    definition_statement: $ => seq(
      'DEFINE',
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
        $.batch_definition
      )
    ),

    namespace_definition: $ => seq('NAMESPACE', $.identifier),

    field_definition: $ => seq(
      'FIELD',
      choice(
        seq($.identifier, ':', $.type, repeat($.decorator)),
        $.batch_id_list
      )
    ),

    enum_definition: $ => seq(
      'ENUM',
      $.identifier,
      optional(seq('<', $.primitive_type, '>')),
      '{',
      commaSep(seq($.identifier, optional(seq('=', $.literal)))),
      '}'
    ),

    struct_definition: $ => seq(
      'STRUCT',
      $.identifier,
      '{',
      commaSep($.identifier),
      '}'
    ),

    trait_definition: $ => seq(
      'TRAIT',
      $.identifier,
      '{',
      commaSep($.identifier),
      '}'
    ),

    role_definition: $ => seq(
      'ROLE',
      choice(
        seq($.identifier, 'ALLOWS', $.role_allows_list),
        seq($.batch_id_list, 'ALLOWS', $.type)
      )
    ),

    role_allows_list: $ => choice(
      seq($.type, optional($.constraint_block)),
      commaSep1(seq($.type, optional($.constraint_block)))
    ),

    constraint_block: $ => seq('{', commaSep(choice($.display_meta, $.constraints_meta, $.expression)), '}'),

    node_definition: $ => seq(
      optional('ABSTRACT'),
      'NODE',
      choice(
        seq($.identifier, optional($.extends_clause), $.node_body, optional($.metadata_block)),
        seq($.batch_node_list)
      )
    ),

    edge_definition: $ => seq(
      optional('ABSTRACT'),
      'EDGE',
      choice(
        seq($.identifier, optional($.extends_clause), $.edge_body, optional($.metadata_block)),
        seq($.batch_edge_list)
      )
    ),

    extends_clause: $ => seq('EXTENDS', choice($.identifier, seq('[', commaSep1($.identifier), ']'))),

    node_body: $ => seq('{', commaSep($.node_entry), '}'),
    node_entry: $ => seq(
      optional('ABSTRACT'),
      $.identifier,
      optional(seq(':', $.type)),
      optional(seq('DEFAULT', $.expression)),
      repeat($.decorator)
    ),

    edge_body: $ => seq('{', commaSep($.edge_entry), '}'),
    edge_entry: $ => choice(
      $.node_entry, // fields
      $.role_entry
    ),

    role_entry: $ => seq(
      $.identifier,
      choice('<-', '->', '<->'),
      $.cardinality
    ),

    cardinality: $ => seq('(', choice($.number, '*', seq($.number, '..', choice($.number, '*'))), ')'),

    metadata_block: $ => seq('{', commaSep(choice($.display_meta, $.constraints_meta)), '}'),
    display_meta: $ => seq('display', ':', $.identifier),
    constraints_meta: $ => seq('constraints', ':', choice($.array_constraints, $.object_constraints)),
    array_constraints: $ => seq('[', commaSep($.expression), ']', repeat($.decorator)),
    object_constraints: $ => seq('{', commaSep(seq($.identifier, ':', $.expression, repeat($.decorator))), '}'),

    function_definition: $ => seq(
      'FUNCTION',
      $.decorator, // purity
      $.identifier,
      '(', commaSep($.parameter), ')',
      ':', $.type,
      $.block
    ),

    aggregate_function_definition: $ => seq(
      'AGGREGATE', 'FUNCTION',
      $.decorator, // purity
      $.identifier,
      '(', commaSep($.parameter), ')',
      ':', $.type,
      '{',
      $.state_clause,
      $.accumulate_clause,
      $.finalize_clause,
      '}'
    ),

    state_clause: $ => seq('STATE', '[', commaSep(seq($.identifier, ':', $.type, '=', $.expression)), ']', ';'),
    accumulate_clause: $ => seq('ACCUMULATE', '[', commaSep(seq($.identifier, '=', $.expression)), ']', ';'),
    finalize_clause: $ => seq('FINALIZE', $.expression, ';'),

    index_definition: $ => seq(
      'INDEX',
      choice(
        seq($.identifier, 'ON', $.identifier, '(', commaSep1($.identifier), ')'),
        seq('[', commaSep($.index_entry), ']')
      )
    ),
    index_entry: $ => seq($.identifier, 'ON', $.identifier, '(', commaSep1($.identifier), ')'),

    materialized_view_definition: $ => seq(
      'MATERIALIZED', 'VIEW', $.identifier,
      'FOR', '[', commaSep1($.identifier), ']',
      'ON', '[', commaSep1($.identifier), ']',
      'INDEX', '[', commaSep1($.identifier), ']'
    ),

    schema_definition: $ => seq('SCHEMA', $.identifier, '[', repeat($.statement), ']'),

    batch_definition: $ => seq('[', commaSep($.definition_statement), ']'),

    // --- Queries & Mutations (DML) ---
    query_statement: $ => repeat1($.query_clause),

    query_clause: $ => choice(
      $.match_clause,
      $.where_clause,
      $.with_clause,
      $.return_clause,
      $.union_clause,
      $.unwind_clause // Assumed from context
    ),

    match_clause: $ => seq(
      optional('OPTIONAL'),
      'MATCH',
      choice($.pattern, seq('[', commaSep1($.pattern), ']'))
    ),

    pattern: $ => choice(
      seq('(', $.identifier, optional(seq(':', $.identifier)), optional($.pattern_object), ')'),
      seq('PATH', $.identifier, '=', $.path_pattern)
    ),

    pattern_object: $ => seq('{', commaSep(choice($.pattern_prop, $.pattern_role)), '}'),
    pattern_prop: $ => seq($.identifier, choice(':', '='), $.expression),
    pattern_role: $ => seq($.identifier, '=>', $.identifier),

    path_pattern: $ => seq(
      '(', $.identifier, ')',
      '-', '[', ':', $.identifier, '*', optional($.identifier), ']', '-', '>',
      '(', $.identifier, ')'
    ),

    where_clause: $ => seq('WHERE', choice($.expression, seq('[', commaSep1($.expression), ']'))),

    with_clause: $ => seq('WITH', choice(commaSep1($.with_entry), seq('[', commaSep1($.with_entry), ']'))),
    with_entry: $ => seq($.expression, optional(seq('AS', $.identifier))),

    return_clause: $ => seq(
      'RETURN',
      optional('DISTINCT'),
      choice(commaSep1($.return_entry), seq('[', commaSep1($.return_entry), ']')),
      optional($.group_by_clause),
      optional($.having_clause),
      optional($.order_by_clause),
      optional($.limit_clause),
      optional($.skip_clause)
    ),

    return_entry: $ => seq($.expression, optional(seq('AS', $.identifier))),

    group_by_clause: $ => seq('GROUP', 'BY', commaSep1($.expression)),
    having_clause: $ => seq('HAVING', choice($.expression, seq('[', commaSep1($.expression), ']'))),
    order_by_clause: $ => seq('ORDER', 'BY', commaSep1($.order_entry)),
    order_entry: $ => seq($.expression, optional(choice('ASC', 'DESC')), optional(seq('NULLS', choice('FIRST', 'LAST')))),
    limit_clause: $ => seq('LIMIT', $.expression),
    skip_clause: $ => seq('SKIP', $.expression),

    union_clause: $ => seq('UNION', optional('ALL')),
    unwind_clause: $ => seq('UNWIND', $.expression, 'AS', $.identifier),

    mutation_statement: $ => choice(
      $.create_statement,
      $.merge_statement,
      $.set_statement,
      $.delete_statement,
      $.alter_statement,
      $.drop_statement,
      $.migrate_statement
    ),

    create_statement: $ => seq(
      'CREATE',
      choice(
        seq('NODE', choice(seq($.identifier, ':', $.identifier, $.object_literal), seq('[', commaSep1($.create_node_entry), ']'))),
        seq('EDGE', choice(seq($.identifier, ':', $.identifier, $.object_literal), seq('[', commaSep1($.create_edge_entry), ']'))),
        seq('USER', $.identifier, 'WITH', 'PASSWORD', $.string, optional(seq('ROLES', '[', commaSep($.identifier), ']'))),
        seq('[', repeat1(choice($.create_node_batch, $.create_edge_batch)), ']')
      )
    ),

    create_node_entry: $ => seq($.identifier, ':', $.identifier, $.object_literal),
    create_edge_entry: $ => seq($.identifier, ':', $.identifier, $.object_literal),
    create_node_batch: $ => seq('NODE', '[', commaSep($.create_node_entry), ']'),
    create_edge_batch: $ => seq('EDGE', '[', commaSep($.create_edge_entry), ']'),

    merge_statement: $ => choice(
      seq('MERGE', '(', $.identifier, ':', $.identifier, $.pattern_object, ')', repeat($.merge_action)),
      seq('MERGE', 'OBJECT', $.identifier, 'WITH', $.parameter_ref)
    ),
    merge_action: $ => seq('ON', choice('CREATE', 'MATCH'), 'SET', $.set_assignments),

    set_statement: $ => seq('SET', choice($.set_assignments, $.set_isolation)),
    set_assignments: $ => commaSep1($.set_assignment),
    set_assignment: $ => choice(
      seq($.identifier, choice('=', '+='), $.expression),
      seq($.member_access, choice('=', '+=', '-='), $.expression)
    ),

    delete_statement: $ => seq(optional('DETACH'), 'DELETE', commaSep1($.identifier)),

    alter_statement: $ => seq(
      'ALTER',
      choice(
        seq('NODE', $.identifier, $.block),
        seq('EDGE', $.identifier, $.block),
        seq('SCHEMA', $.identifier, '[', repeat($.alter_schema_entry), ']'),
        seq('USER', $.identifier, choice(seq('SET', 'PASSWORD', $.string), seq('ADD', 'ROLES', '[', commaSep($.identifier), ']'), seq('REMOVE', 'ROLES', '[', commaSep($.identifier), ']'))),
        seq('NAMESPACE', $.identifier, 'SET', 'STRICT_PERMISSIONS', choice('ON', 'OFF'))
      )
    ),
    alter_schema_entry: $ => seq(choice('ADD', 'DROP', 'RENAME'), $.identifier, optional(seq('TO', $.identifier))),

    drop_statement: $ => seq('DROP', choice('USER', 'SCHEMA', 'NODE', 'EDGE', 'FIELD', 'ROLE'), $.identifier),

    migrate_statement: $ => choice(
      seq('MIGRATE', $.identifier, 'TO', $.identifier, optional(seq('MAP', $.object_literal)), optional(seq('DEFAULTS', $.object_literal))),
      seq('VALIDATE', 'MIGRATION', $.identifier, 'TO', $.identifier, optional(seq('MAP', $.object_literal)), optional(seq('DEFAULTS', $.object_literal)))
    ),

    // --- Transactions ---
    transaction_statement: $ => seq(
      choice('BEGIN', 'COMMIT', 'ROLLBACK'),
      optional(seq('ISOLATION', 'LEVEL', $.identifier)),
      optional('ON ERROR CONTINUE')
    ),

    set_isolation: $ => seq('ISOLATION', 'LEVEL', $.identifier),

    // --- Imports ---
    import_statement: $ => seq(
      'IMPORT',
      choice(
        seq($.identifier, repeat(seq('.', $.identifier))),
        seq('SCHEMA', $.identifier, 'FROM', $.identifier, repeat(seq('.', $.identifier))),
        seq($.string, 'AS', $.identifier)
      )
    ),

    // --- Introspection ---
    introspection_statement: $ => seq(
      choice(
        seq('SHOW', choice('ACCESS', 'USERS', 'PERMISSIONS', 'EFFECTIVE', 'NAMESPACE', 'SCHEMA', 'FIELD', 'NODE', 'EDGE', 'ROLE')),
        seq('VALIDATE', 'SCHEMA', $.identifier)
      ),
      repeat($.identifier)
    ),

    // --- Security ---
    access_role_definition: $ => seq(
      'ACCESS', 'ROLE', $.identifier,
      '[', repeat($.access_entry), ']'
    ),
    access_entry: $ => seq(
      choice('GRANT', 'DENY'),
      choice('NAMESPACE', 'NODE', 'EDGE', 'FIELD'),
      $.identifier,
      'PERMISSIONS', '[', commaSep($.identifier), ']',
      optional(choice('CASCADE', 'NO CASCADE'))
    ),

    access_policy_definition: $ => seq(
      'ACCESS', 'POLICY', $.identifier, 'ON', $.identifier, 'FOR', 'ACCESS', 'ROLE', $.identifier, 'USING', '(', $.expression, ')'
    ),

    // --- Expressions ---
    expression: $ => choice(
      $.conditional_expression,
      $.binary_expression,
      $.unary_expression,
      $.primary_expression
    ),

    binary_expression: $ => choice(
      ...[
        ['||', 20],
        ['&&', 30],
        ['==', 40],
        ['!=', 40],
        ['<', 50],
        ['>', 50],
        ['<=', 50],
        ['>=', 50],
        ['IN', 50],
        ['|', 55],
        ['&', 55],
        ['+', 60],
        ['-', 60],
        ['*', 70],
        ['/', 70],
        ['%', 70],
        ['??', 75],
        ['LIKE', 50],
        ['ILIKE', 50],
        ['MATCHES', 50],
        ['IMATCHES', 50],
      ].map(([operator, precedence]) =>
        prec.left(precedence, seq($.expression, operator, $.expression))
      )
    ),

    unary_expression: $ => choice(
      prec(80, seq(choice('!', '-', '~'), $.expression)),
      prec(10, seq($.expression, 'IS', optional('NOT'), 'NULL'))
    ),

    primary_expression: $ => choice(
      $.literal,
      $.identifier,
      $.member_access,
      $.function_call,
      $.subquery_expression,
      $.parameter_ref,
      $.enum_shorthand,
      seq('(', $.expression, ')')
    ),

    conditional_expression: $ => choice(
      $.if_expression,
      $.case_expression,
      $.match_expression
    ),

    if_expression: $ => seq('IF', $.expression, 'THEN', $.expression, 'ELSE', $.expression),

    case_expression: $ => seq(
      'CASE',
      optional($.expression),
      repeat1(seq('WHEN', $.expression, 'THEN', $.expression)),
      optional(seq('ELSE', $.expression)),
      'END'
    ),

    match_expression: $ => seq(
      'MATCH', $.expression, '{',
      commaSep1(seq($.expression, '=>', $.expression)),
      '}'
    ),

    subquery_expression: $ => seq(
      choice('EXISTS', seq($.expression, 'IN')),
      '(', repeat1($.query_clause), ')'
    ),

    member_access: $ => choice(
      prec.left(100, seq($.expression, choice('.', '?.'), $.identifier)),
      prec.left(100, seq('this', '.', $.identifier))
    ),

    function_call: $ => prec(90, seq($.identifier, '(', commaSep($.expression), ')')),

    parameter_ref: $ => seq('$', $.identifier, optional(seq(':', $.type))),

    enum_shorthand: $ => seq('.', $.identifier),

    // --- Scripting / Blocks ---
    block: $ => seq('{', repeat($.script_statement), '}'),
    script_statement: $ => choice(
      $.var_decl,
      $.const_decl,
      $.while_stmt,
      $.for_in_stmt,
      $.if_else_stmt,
      $.return_stmt,
      $.assign_stmt,
      $.break_stmt,
      $.continue_stmt,
      seq($.expression, ';')
    ),

    var_decl: $ => seq('VAR', $.identifier, optional(seq(':', $.type)), optional(seq('=', $.expression)), ';'),
    const_decl: $ => seq('CONST', $.identifier, optional(seq(':', $.type)), '=', $.expression, ';'),
    while_stmt: $ => seq('WHILE', '(', $.expression, ')', $.block),
    for_in_stmt: $ => seq('FOR', '(', $.identifier, 'IN', $.expression, ')', $.block),
    if_else_stmt: $ => seq('IF', '(', $.expression, ')', $.block, optional(seq('ELSE', $.block))),
    return_stmt: $ => seq('RETURN', $.expression, ';'),
    assign_stmt: $ => seq($.identifier, '=', $.expression, ';'),
    break_stmt: $ => seq('BREAK', ';'),
    continue_stmt: $ => seq('CONTINUE', ';'),

    // --- Basic Tokens ---
    identifier: $ => /[a-zA-Z_][a-zA-Z0-9_]*/,

    type: $ => seq(
      $.identifier,
      optional(seq('<', commaSep1($.type), '>')),
      optional('?')
    ),

    primitive_type: $ => choice('INT', 'FLOAT', 'STRING', 'BOOL', 'DATE', 'UUID', 'DECIMAL', 'FLAGS'),

    decorator: $ => /@[a-zA-Z_][a-zA-Z0-9_]*/,

    literal: $ => choice(
      $.string,
      $.number,
      $.boolean,
      'null'
    ),

    string: $ => /"([^"\\]|\\.)*"/,
    number: $ => /-?\d+(\.\d+)?d?/,
    boolean: $ => choice('true', 'false'),

    comment: $ => /--.*/,

    parameter: $ => seq($.identifier, ':', $.type),

    batch_id_list: $ => seq('[', commaSep1($.identifier), ']'),
    batch_node_list: $ => seq('[', commaSep1(seq(optional('ABSTRACT'), $.identifier, $.node_body, optional($.metadata_block))), ']'),
    batch_edge_list: $ => seq('[', commaSep1(seq(optional('ABSTRACT'), $.identifier, $.edge_body, optional($.metadata_block))), ']'),

    object_literal: $ => seq('{', commaSep(seq($.identifier, choice(':', '='), $.expression)), '}')
  }
});

function commaSep(rule) {
  return optional(commaSep1(rule));
}

function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)), optional(','));
}

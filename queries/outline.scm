(namespace_body (dotted_identifier) @name) @item
(schema_definition (identifier) @name) @item

; These will now catch both singular definitions AND batches
(node_entry_full (dotted_identifier) @name) @item
(edge_entry_full (dotted_identifier) @name) @item
(enum_entry_full (dotted_identifier) @name) @item

(struct_definition (dotted_identifier) @name) @item
(trait_definition (dotted_identifier) @name) @item
(union_definition (dotted_identifier) @name) @item
(view_definition (dotted_identifier) @name) @item
(materialized_view_definition (identifier) @name) @item

(function_definition (identifier) @name) @item
(aggregate_function_definition (identifier) @name) @item

# Changes

## Subject Tagging

When `ability.can()` is called, it is called with an "action" and a "subject".  The subject can be an instance of a class, or can be a string which 
sort of represents a class.  If it is an instance of a class, then rules with fields and conditions work nicely, but if it is a string, rules checking
is somewhat limited.  Sometimes your subject is a plain old object.  You can try to alleviate this by supplying a custom `sourceName()` function to 
Ability.define, which could look inside your subjects for an attribute that holds a class name, but sometimes you just can't easily add something like this
to objects you may not control or want to modify.

So now you can pass an array as the subject, whose first element is the subject object and the second element is the class name.  Like so:

```js
  if ( user.ability.can( 'edit', [grp, 'Group'] ) ...
```

where `grp` is a plain old object, but will be treated as through it is an instance of a "Group".

## Scoping

Conditions are cool when you want to look iinside the subject to determine if a rule should return true or false.  But what if you want to
compare fields inside the subject with fields inside the user?  You can do some of this with conditions, but you are limited by MongoDB
query-like operators.  Sometimes that just isn't enough.  A user might belong to a group.  Groups might be arranged as a hierarchy tree.  Some
users might be able to edit only groups they belong to, other might be able to edit the group they belong to and one level of groups below that,
which others might be able to edit all groups under their own, but no groups aove their own.  This logic would be impossible to express as
a MongoDB query.  

I could probably have changed the code such that conditions could be an object (MongoDB query) or a function.  Instead I added another optional
argument to Ability Builder's `can()` method; something called a "scope".  This comes after "subject" and before "fields" but is optional. 
If specified, this function will be called with the subject as the first argument and rule as the second.  This function is expected to return true if the user can
perform the action, or false if they cannot.  If this function is specifed, this check happens before the other checks and if it returns false,
the user cannot perform the operation.  If this function returns true, then the other checks are performed.

Since scoping involves a function, it cannot be serialized.  So scoping can only be used in dynamic code.

The "scope" can be an array of functions.  If it is an array of functions, they all must return true (an AND) for the rule to succeed.

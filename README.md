# Contribution weighted voting

## Overview

This is voting canister with contribution weight.

## Functions

<dl>
    <dt>createPoll</dt>
    <dd>Create poll with parameters.</dd>
    <dt>getPollByName</dt>
    <dd>Get information of the poll specified by the poll name.</dd>
    <dt>getAllPolls</dt>
    <dd>Get information of all polls.</dd>
    <dt>registerVoterToPoll</dt>
    <dd>Register voter votername to the poll pollname.</dd>
    <dt>changeVoterContribution</dt>
    <dd>Change voter's contribution.</dd>
    <dt>voteToPoll</dt>
    <dd>Vote to the poll.</dd>
    <dt>getVotingResult</dt>
    <dd>Get voting result.</dd>
</dl>

## Test

The tests are written in bats.  I used bats because I did not know how to change the principal of the canister caller in 'azle/test'.

## Remaining issues

* Bats hangs on last test, use Ctrl-C to continue.

## Contribution

Contributions are welcome. Please open an issue or submit a pull request.

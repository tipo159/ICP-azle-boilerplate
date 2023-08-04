#!/usr/bin/env bats

wait_until() {
    local seconds=$1

    while [[ `date +%s` -le ${seconds} ]]; do
        sleep 1 3>&-
    done
}

run_wrapper() {
    run "${@}" 3>&-
}

#bats test_tags=err
@test "createPoll InvalidDateFormat" {
    dfx identity use default 3>&-
    run_wrapper dfx canister call contribution_weighted_voting_azle createPoll "(record {\"name\"=\"Poll1\"; \
            \"description\"=\"Poll1\"; \"no_of_options\"=3; \"options\"=(vec { \"option1\"; \"option2\"; \
            \"option3\" }); \"pollClosingDate\"=\"2023-07-32T01:02:03+09:00\"})"
    [[ "$output" == *"Err = \"Date formatting is invalid."* ]]
}

#bats test_tags=err
@test "createPoll OptionLengthMismatch" {
    dfx identity use default 3>&-
    run_wrapper dfx canister call contribution_weighted_voting_azle createPoll "(record {\"name\"=\"Poll1\"; \
            \"description\"=\"Poll1\"; \"no_of_options\"=3; \"options\"=(vec { \"option1\"; \"option2\" }); \
            \"pollClosingDate\"=\"${DATE}\"})"
    [[ "$output" == *"Err = \"The length of options and no_of_options are different."* ]]
}

#bats test_tags=ok
@test "createPoll Poll1 ..." {
    dfx identity use default 3>&-
    run_wrapper dfx canister call contribution_weighted_voting_azle createPoll "(record {\"name\"=\"Poll1\"; \
            \"description\"=\"Poll1\"; \"no_of_options\"=3; \"options\"=(vec { \"option1\"; \"option2\"; \"option3\" }); \
            \"pollClosingDate\"=\"${DATE}\"})"
    [[ "$output" == *"Ok"* ]]
}

#bats test_tags=err
@test "createPoll PollAlreadyExists" {
    dfx identity use default 3>&-
    run_wrapper dfx canister call contribution_weighted_voting_azle createPoll "(record {\"name\"=\"Poll1\"; \
            \"description\"=\"Poll1\"; \"no_of_options\"=3; \"options\"=(vec { \"option1\"; \"option2\"; \"option3\" }); \
            \"pollClosingDate\"=\"${DATE}\"})"
    [[ "$output" == *"Err = \"Poll "* ]]
}

#bats test_tags=ok
@test "createPoll Poll2 ..." {
    dfx identity use user1 3>&-
    run_wrapper dfx canister call contribution_weighted_voting_azle createPoll "(record {\"name\"=\"Poll2\"; \
            \"description\"=\"Poll2\"; \"no_of_options\"=3; \"options\"=(vec { \"option1\"; \"option2\"; \"option3\" }); \
            \"pollClosingDate\"=\"${DATE}\"})"
    [[ "$output" == *"Ok"* ]]
}

#bats test_tags=ok
@test "createPoll Poll3 ..." {
    dfx identity use default 3>&-
    run_wrapper dfx canister call contribution_weighted_voting_azle createPoll "(record {\"name\"=\"Poll3\"; \
            \"description\"=\"Poll3\"; \"no_of_options\"=3; \"options\"=(vec { \"option1\"; \"option2\"; \"option3\" }); \
            \"pollClosingDate\"=\"${DATE}\"})"
    [[ "$output" == *"Ok"* ]]
}

#bats test_tags=err
@test "createPoll MaxPollsReached" {
    dfx identity use default 3>&-
    run_wrapper dfx canister call contribution_weighted_voting_azle createPoll "(record {\"name\"=\"Poll4\"; \
            \"description\"=\"Poll4\"; \"no_of_options\"=3; \"options\"=(vec { \"option1\"; \"option2\"; \"option3\" }); \
            \"pollClosingDate\"=\"${DATE}\"})"
    [[ "$output" == *"Err = \"Maximum number of polls reached."* ]]
}

#bats test_tags=err
@test "getPollByName PollNotFound" {
    dfx identity use default 3>&-
    run_wrapper dfx canister call contribution_weighted_voting_azle getPollByName "Poll4"
    [[ "$output" == *"Err = \"Poll not found."* ]]
}

#bats test_tags=ok
@test "getPollByName Poll1" {
    dfx identity use default 3>&-
    run_wrapper dfx canister call contribution_weighted_voting_azle getPollByName "Poll1"
    [[ "$output" == *"Ok"* ]]
}

#bats test_tags=err
@test "registerVoterToPoll PollNotFound" {
    dfx identity use default 3>&-
    run_wrapper dfx canister call contribution_weighted_voting_azle registerVoterToPoll "(\"Poll4\", \"user0\")"
    [[ "$output" == *"Err = \"Poll not found."* ]]
}

#bats test_tags=ok
@test "registerVoterToPoll Poll1 user0" {
    dfx identity use default 3>&-
    run_wrapper dfx canister call contribution_weighted_voting_azle registerVoterToPoll "(\"Poll1\", \"user0\")"
    [[ "$output" == *"Ok"* ]]
}

#bats test_tags=err
@test "registerVoterToPoll VoterAlreadyExists" {
    dfx identity use default 3>&-
    run_wrapper dfx canister call contribution_weighted_voting_azle registerVoterToPoll "(\"Poll1\", \"user0\")"
    [[ "$output" == *"Err = \"Voter already in use."* ]]
}

#bats test_tags=err
@test "registerVoterToPoll VoterAlreadyRegistered" {
    dfx identity use default 3>&-
    run_wrapper dfx canister call contribution_weighted_voting_azle registerVoterToPoll "(\"Poll1\", \"user1\")"
    [[ "$output" == *"Err = \"Voter principal is already in use."* ]]
}

#bats test_tags=ok
@test "registerVoterToPoll Poll1 user1" {
    dfx identity use user1 3>&-
    run_wrapper dfx canister call contribution_weighted_voting_azle registerVoterToPoll "(\"Poll1\", \"user1\")"
    [[ "$output" == *"Ok"* ]]
}

#bats test_tags=ok
@test "registerVoterToPoll Poll1 user2" {
    dfx identity use user2 3>&-
    run_wrapper dfx canister call contribution_weighted_voting_azle registerVoterToPoll "(\"Poll1\", \"user2\")"
    [[ "$output" == *"Ok"* ]]
}

#bats test_tags=ok
@test "registerVoterToPoll Poll1 user3" {
    dfx identity use user3 3>&-
    run_wrapper dfx canister call contribution_weighted_voting_azle registerVoterToPoll "(\"Poll1\", \"user3\")"
    [[ "$output" == *"Ok"* ]]
}

#bats test_tags=ok
@test "getPollByName Poll1 by owner" {
    dfx identity use default 3>&-
    run_wrapper dfx canister call contribution_weighted_voting_azle getPollByName "Poll1"
    [[ "$output" == *"Ok"* && "$output" != *"voters = vec {}"* ]]
}

#bats test_tags=ok
@test "getPollByName Poll1 by non-owner" {
    dfx identity use user1 3>&-
    run_wrapper dfx canister call contribution_weighted_voting_azle getPollByName "Poll1"
    [[ "$output" == *"Ok"* && "$output" == *"voters = vec {}"* ]]
}

#bats test_tags=err
@test "changeVoterContribution OwnerCannotChangeContribution" {
    dfx identity use default 3>&-
    run_wrapper dfx canister call contribution_weighted_voting_azle changeVoterContribution "(\"Poll1\", \"user0\", 1.1)"
    [[ "$output" == *"Err = \"The owner of the poll cannot change their own contribution."* ]]
}

#bats test_tags=err
@test "changeVoterContribution CallerNotPollOwner" {
    dfx identity use user1 3>&-
    run_wrapper dfx canister call contribution_weighted_voting_azle changeVoterContribution "(\"Poll1\", \"user1\", 1.1)"
    [[ "$output" == *"Err = \"Caller is not the owner of the poll."* ]]
}

#bats test_tags=err
@test "changeVoterContribution VoterNotRegistered" {
    dfx identity use default 3>&-
    run_wrapper dfx canister call contribution_weighted_voting_azle changeVoterContribution "(\"Poll1\", \"user4\", 1.1)"
    [[ "$output" == *"Err = \"Voter not found."* ]]
}

#bats test_tags=err
@test "changeVoterContribution PollNotFound" {
    dfx identity use default 3>&-
    run_wrapper dfx canister call contribution_weighted_voting_azle changeVoterContribution "(\"Poll4\", \"user1\", 1.1)"
    [[ "$output" == *"Err = \"Poll not found."* ]]
}

#bats test_tags=ok
@test "changeVoterContribution Poll1 user1 1.1" {
    dfx identity use default 3>&-
    run_wrapper dfx canister call contribution_weighted_voting_azle changeVoterContribution "(\"Poll1\", \"user1\", 1.1)"
    [[ "$output" == *"Ok"* ]]
}

#bats test_tags=err
@test "voteToPoll PollNotFound" {
    dfx identity use user1 3>&-
    run_wrapper dfx canister call contribution_weighted_voting_azle voteToPoll "(\"Poll4\", \"user4\", \"option1\")"
    [[ "$output" == *"Err = \"Poll not found."* ]]
}

#bats test_tags=err
@test "voteToPoll VoterNotRegistered" {
    dfx identity use user1 3>&-
    run_wrapper dfx canister call contribution_weighted_voting_azle voteToPoll "(\"Poll1\", \"user4\", \"option1\")"
    [[ "$output" == *"Err = \"Voter not found."* ]]
}

#bats test_tags=err
@test "voteToPoll UnauthorizedVoter" {
    dfx identity use default 3>&-
    run_wrapper dfx canister call contribution_weighted_voting_azle voteToPoll "(\"Poll1\", \"user1\", \"option1\")"
    [[ "$output" == *"Err = \"The registered principal and voter\'s principal are different."* ]]
}

#bats test_tags=err
@test "voteToPoll OptionNotFound" {
    dfx identity use user1 3>&-
    run_wrapper dfx canister call contribution_weighted_voting_azle voteToPoll "(\"Poll1\", \"user1\", \"option4\")"
    [[ "$output" == *"Err = \"Option not found."* ]]
}

#bats test_tags=ok
@test "voteToPoll Poll1 user0 option1" {
    dfx identity use default 3>&-
    run_wrapper dfx canister call contribution_weighted_voting_azle voteToPoll "(\"Poll1\", \"user0\", \"option1\")"
    [[ "$output" == *"Ok"* ]]
}

#bats test_tags=ok
@test "voteToPoll Poll1 user1 option1" {
    dfx identity use user1 3>&-
    run_wrapper dfx canister call contribution_weighted_voting_azle voteToPoll "(\"Poll1\", \"user1\", \"option1\")"
    [[ "$output" == *"Ok"* ]]
}

#bats test_tags=ok
@test "voteToPoll Poll1 user2 option2" {
    dfx identity use user2 3>&-
    run_wrapper dfx canister call contribution_weighted_voting_azle voteToPoll "(\"Poll1\", \"user2\", \"option2\")"
    [[ "$output" == *"Ok"* ]]
}

#bats test_tags=ok
@test "voteToPoll Poll1 user3 option3" {
    dfx identity use user3 3>&-
    run_wrapper dfx canister call contribution_weighted_voting_azle voteToPoll "(\"Poll1\", \"user3\", \"option3\")"
    [[ "$output" == *"Ok"* ]]
}

#bats test_tags=err
@test "getVotingResult BeforeDeadline" {
    dfx identity use user1 3>&-
    run_wrapper dfx canister call contribution_weighted_voting_azle getVotingResult "Poll1"
    [[ "$output" == *"Err = \"It\'s before the voting deadline."* ]]
}

#bats test_tags=ok
@test "getVotingResult Poll1" {
    wait_until ${SECONDS}

    dfx identity use user1 3>&-
    run_wrapper dfx canister call contribution_weighted_voting_azle getVotingResult "Poll1"
    [[ "$output" == *"Ok = vec { \"option1: 2.10\"; \"option2: 1.00\"; \"option3: 1.00\" }"* ]]
}

#bats test_tags=err
@test "getVotingResult PollNotFound" {
    dfx identity use user1 3>&-
    run_wrapper dfx canister call contribution_weighted_voting_azle getVotingResult "Poll4"
    [[ "$output" == *"Err = \"Poll not found."* ]]
}

#bats test_tags=err
@test "getVotingResult UnauthorizedView" {
    dfx identity use anonymous 3>&-
    run_wrapper dfx canister call contribution_weighted_voting_azle getVotingResult "Poll1"
    [[ "$output" == *"Err = \"Only the voter and the owner of the poll can see voting results."* ]]
}

#bats test_tags=err
@test "voteToPoll VotingClosed" {
    dfx identity use user1 3>&-
    run_wrapper dfx canister call contribution_weighted_voting_azle voteToPoll "(\"Poll1\", \"user1\", \"option1\")"
    [[ "$output" == *"Err = \"Voting is closed."* ]]
}

#bats test_tags=ok
@test "getAllPolls" {
    dfx identity use default 3>&-
    run_wrapper dfx canister call contribution_weighted_voting_azle getAllPolls
    [[ "$output" == *"record {"* ]]
}

#bats test_tags=ok
@test "Press Ctrl-C to contine" {
    run_wrapper true
    [[ true ]]
}

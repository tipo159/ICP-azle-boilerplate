#!/usr/bin/env bats

setup() {
    load 'test_helper/bats-support/load'
    load 'test_helper/bats-assert/load'
}

wait_until() {
    local -r date=$1

    echo "wait_until(" $date ")" >&3
    echo " start:" `date -Iseconds` >&3
    while [[ `date -Iseconds` < ${date} ]]; do
        sleep 1
    done
    sleep 1
    sleep 1
    echo " end:" `date -Iseconds` >&3
}

#bats test_tags=ok
@test "getAllPolls (Empty)" {
    dfx identity use default
    run dfx canister call contribution_weighted_voting_azle getAllPolls
    assert_output '(vec {})'
}

#bats test_tags=err
@test "createPoll InvalidDate" {
    dfx identity use default
    run dfx canister call contribution_weighted_voting_azle createPoll "(record {\"name\"=\"Poll1\"; \
            \"description\"=\"Poll1\"; \"options\"=(vec { \"option1\"; \"option2\"; \"option3\" }); \
            \"pollClosingDate\"=\"2023-07-32T01:02:03+09:00\"})"
    assert_output --partial 'Err = "Date format is invalid.'
}

#bats test_tags=err
@test "createPoll PollClosingTimeMustFuture" {
    dfx identity use default
    run dfx canister call contribution_weighted_voting_azle createPoll "(record {\"name\"=\"Poll1\"; \
            \"description\"=\"Poll1\"; \"options\"=(vec { \"option1\"; \"option2\"; \"option3\" }); \
            \"pollClosingDate\"=\"2023-01-01T00:00:00+09:00\"})"
    assert_output --partial 'Err = "Poll closing time must be in the future.'
}

#bats test_tags=ok
@test "createPoll Poll1 ..." {
    dfx identity use default
    run dfx canister call contribution_weighted_voting_azle createPoll "(record {\"name\"=\"Poll1\"; \
            \"description\"=\"Poll1\"; \"options\"=(vec { \"option1\"; \"option2\"; \"option3\" }); \
            \"pollClosingDate\"=\"${DATE}\"})"
    assert_output --partial 'Ok'
}

#bats test_tags=err
@test "createPoll PollInUse" {
    dfx identity use default
    run dfx canister call contribution_weighted_voting_azle createPoll "(record {\"name\"=\"Poll1\"; \
            \"description\"=\"Poll1\"; \"options\"=(vec { \"option1\"; \"option2\"; \"option3\" }); \
            \"pollClosingDate\"=\"${DATE}\"})"
    assert_output --partial 'Err = "Poll already in use.'
}

#bats test_tags=ok
@test "createPoll Poll2 ..." {
    dfx identity use user1
    run dfx canister call contribution_weighted_voting_azle createPoll "(record {\"name\"=\"Poll2\"; \
            \"description\"=\"Poll2\"; \"options\"=(vec { \"option1\"; \"option2\"; \"option3\" }); \
            \"pollClosingDate\"=\"${DATE}\"})"
    assert_output --partial 'Ok'
}

#bats test_tags=ok
@test "createPoll Poll3 ..." {
    dfx identity use default
    run dfx canister call contribution_weighted_voting_azle createPoll "(record {\"name\"=\"Poll3\"; \
            \"description\"=\"Poll3\"; \"options\"=(vec { \"option1\"; \"option2\"; \"option3\" }); \
            \"pollClosingDate\"=\"${DATE}\"})"
    assert_output --partial 'Ok'
}

#bats test_tags=err
@test "createPoll TooManyPolls" {
    dfx identity use default
    run dfx canister call contribution_weighted_voting_azle createPoll "(record {\"name\"=\"Poll4\"; \
            \"description\"=\"Poll4\"; \"options\"=(vec { \"option1\"; \"option2\"; \"option3\" }); \
            \"pollClosingDate\"=\"${DATE}\"})"
    assert_output --partial 'Err = "Too many polls created.'
}

#bats test_tags=err
@test "getPollByName PollNotExist" {
    dfx identity use default
    run dfx canister call contribution_weighted_voting_azle getPollByName 'Poll4'
    assert_output --partial 'Err = "Poll does not exist.'
}

#bats test_tags=ok
@test "getPollByName Poll1" {
    dfx identity use default
    run dfx canister call contribution_weighted_voting_azle getPollByName 'Poll1'
    assert_output --partial 'Ok'
}

#bats test_tags=ok
@test "getAllPolls (Poll1)" {
    dfx identity use default
    run dfx canister call contribution_weighted_voting_azle getAllPolls
    assert_output --partial 'record {'
}

#bats test_tags=err
@test "registerVoterToPoll PollNotExist" {
    dfx identity use default
    run dfx canister call contribution_weighted_voting_azle registerVoterToPoll '("Poll4", "user0")'
    assert_output --partial 'Err = "Poll does not exist.'
}

#bats test_tags=ok
@test "registerVoterToPoll Poll1 user0" {
    dfx identity use default
    run dfx canister call contribution_weighted_voting_azle registerVoterToPoll '("Poll1", "user0")'
    assert_output --partial 'Ok'
}

#bats test_tags=err
@test "registerVoterToPoll VoterInUse" {
    dfx identity use default
    run dfx canister call contribution_weighted_voting_azle registerVoterToPoll '("Poll1", "user0")'
    assert_output --partial 'Err = "Voter already in use.'
}

#bats test_tags=err
@test "registerVoterToPoll VoterPrincipalInUse" {
    dfx identity use default
    run dfx canister call contribution_weighted_voting_azle registerVoterToPoll '("Poll1", "user1")'
    assert_output --partial 'Err = "Voter principal already in use.'
}

#bats test_tags=ok
@test "registerVoterToPoll Poll1 user1" {
    dfx identity use user1
    run dfx canister call contribution_weighted_voting_azle registerVoterToPoll '("Poll1", "user1")'
    assert_output --partial 'Ok'
}

#bats test_tags=ok
@test "registerVoterToPoll Poll1 user2" {
    dfx identity use user2
    run dfx canister call contribution_weighted_voting_azle registerVoterToPoll '("Poll1", "user2")'
    assert_output --partial 'Ok'
}

#bats test_tags=ok
@test "registerVoterToPoll Poll1 user3" {
    dfx identity use user3
    run dfx canister call contribution_weighted_voting_azle registerVoterToPoll '("Poll1", "user3")'
    assert_output --partial 'Ok'
}

#bats test_tags=ok
@test "getPollByName Poll1 by owner (voters != {})" {
    dfx identity use default
    run dfx canister call contribution_weighted_voting_azle getPollByName 'Poll1'
    assert_line --index 2 '    Ok = record {'
    assert_line --index 8 '      voters = vec {'
}

#bats test_tags=ok
@test "getPollByName Poll1 by non-owner (voters == {})" {
    dfx identity use user1
    run dfx canister call contribution_weighted_voting_azle getPollByName 'Poll1'
    assert_line --index 2 '    Ok = record {'
    assert_line --index 8 '      voters = vec {};'
}

#bats test_tags=ok
@test "getAllPolls (Poll1 Poll2 Poll3) by owner (voters != {})" {
    dfx identity use default
    run dfx canister call contribution_weighted_voting_azle getAllPolls
    assert_line --index 8 '      voters = vec {'
}

#bats test_tags=ok
@test "getAllPolls (Poll1 Poll2 Poll3) by non-owner (voters == {})" {
    dfx identity use user1
    run dfx canister call contribution_weighted_voting_azle getAllPolls
    assert_line --index 8 '      voters = vec {};'
}

#bats test_tags=err
@test "changeVoterContribution PollOwnerCannotChangeContribution" {
    dfx identity use default
    run dfx canister call contribution_weighted_voting_azle changeVoterContribution '("Poll1", "user0", 1.1)'
    assert_output --partial 'Err = "Poll owner cannot change own contribution.'
}

#bats test_tags=err
@test "changeVoterContribution CallerNotPollOwner" {
    dfx identity use user1
    run dfx canister call contribution_weighted_voting_azle changeVoterContribution '("Poll1", "user1", 1.1)'
    assert_output --partial 'Err = "Caller is not the poll owner.'
}

#bats test_tags=err
@test "changeVoterContribution VoterNotExist" {
    dfx identity use default
    run dfx canister call contribution_weighted_voting_azle changeVoterContribution '("Poll1", "user4", 1.1)'
    assert_output --partial 'Err = "Voter does not exist.'
}

#bats test_tags=err
@test "changeVoterContribution PollNotExist" {
    dfx identity use default
    run dfx canister call contribution_weighted_voting_azle changeVoterContribution '("Poll4", "user1", 1.1)'
    assert_output --partial 'Err = "Poll does not exist.'
}

#bats test_tags=ok
@test "changeVoterContribution Poll1 user1 1.1" {
    dfx identity use default
    run dfx canister call contribution_weighted_voting_azle changeVoterContribution '("Poll1", "user1", 1.1)'
    assert_output --partial 'Ok'
}

#bats test_tags=err
@test "voteToPoll PollNotExist" {
    dfx identity use user1
    run dfx canister call contribution_weighted_voting_azle voteToPoll '("Poll4", "user4", "option1")'
    assert_output --partial 'Err = "Poll does not exist.'
}

#bats test_tags=err
@test "voteToPoll VoterNotExist" {
    dfx identity use user1
    run dfx canister call contribution_weighted_voting_azle voteToPoll '("Poll1", "user4", "option1")'
    assert_output --partial 'Err = "Voter does not exist.'
}

#bats test_tags=err
@test "voteToPoll VoterNotAuthorized" {
    dfx identity use default
    run dfx canister call contribution_weighted_voting_azle voteToPoll '("Poll1", "user1", "option1")'
    assert_output --partial 'Err = "Voter is not authorized.'
}

#bats test_tags=err
@test "voteToPoll OptionNotExist" {
    dfx identity use user1
    run dfx canister call contribution_weighted_voting_azle voteToPoll '("Poll1", "user1", "option4")'
    assert_output --partial 'Err = "Option does not exist.'
}

#bats test_tags=ok
@test "voteToPoll Poll1 user0 option1" {
    dfx identity use default
    run dfx canister call contribution_weighted_voting_azle voteToPoll '("Poll1", "user0", "option1")'
    assert_output --partial 'Ok'
}

#bats test_tags=ok
@test "voteToPoll Poll1 user1 option1" {
    dfx identity use user1
    run dfx canister call contribution_weighted_voting_azle voteToPoll '("Poll1", "user1", "option1")'
    assert_output --partial 'Ok'
}

#bats test_tags=ok
@test "voteToPoll Poll1 user2 option2" {
    dfx identity use user2
    run dfx canister call contribution_weighted_voting_azle voteToPoll '("Poll1", "user2", "option2")'
    assert_output --partial 'Ok'
}

#bats test_tags=ok
@test "voteToPoll Poll1 user3 option3" {
    dfx identity use user3
    run dfx canister call contribution_weighted_voting_azle voteToPoll '("Poll1", "user3", "option3")'
    assert_output --partial 'Ok'
}

#bats test_tags=ok
@test "getPollByName Poll1 by owner (votingDetails != {})" {
    dfx identity use default
    run dfx canister call contribution_weighted_voting_azle getPollByName 'Poll1'
    assert_line --index 2 '    Ok = record {'
    assert_line --index 3 '      votingDetails = vec {'
}

#bats test_tags=ok
@test "getPollByName Poll1 by non-owner (votingDetails == {})" {
    dfx identity use user1
    run dfx canister call contribution_weighted_voting_azle getPollByName 'Poll1'
    assert_line --index 2 '    Ok = record {'
    assert_line --index 3 '      votingDetails = vec {};'
}

#bats test_tags=ok
@test "getAllPolls (Poll1 Poll2 Poll3) by owner (votingDetails != {})" {
    dfx identity use default
    run dfx canister call contribution_weighted_voting_azle getAllPolls
    assert_line --index 3 '      votingDetails = vec {'
}

#bats test_tags=ok
@test "getAllPolls (Poll1 Poll2 Poll3) by non-owner (votingDetails == {})" {
    dfx identity use user1
    run dfx canister call contribution_weighted_voting_azle getAllPolls
    assert_line --index 3 '      votingDetails = vec {};'
}

#bats test_tags=err
@test "getVotingResult VotingNotClosed" {
    dfx identity use user1
    run dfx canister call contribution_weighted_voting_azle getVotingResult 'Poll1'
    assert_output --partial 'Err = "Voting is not closed.'
}

#bats test_tags=ok
@test "getVotingResult Poll1" {
    wait_until ${DATE}

    dfx identity use user1
    run dfx canister call contribution_weighted_voting_azle getVotingResult 'Poll1'
    assert_output --partial 'Ok = vec { "option1: 2.10"; "option2: 1.00"; "option3: 1.00" }'
}

#bats test_tags=err
@test "getVotingResult PollNotExist" {
    dfx identity use user1
    run dfx canister call contribution_weighted_voting_azle getVotingResult 'Poll4'
    assert_output --partial 'Err = "Poll does not exist.'
}

#bats test_tags=err
@test "getVotingResult OnlyVoterAndPollOwnerCanViewResults" {
    dfx identity use anonymous
    run dfx canister call contribution_weighted_voting_azle getVotingResult 'Poll1'
    assert_output --partial 'Err = "Only the voter and the poll owner can view voting results.'
}

#bats test_tags=err
@test "voteToPoll VotingIsOver" {
    dfx identity use user1
    run dfx canister call contribution_weighted_voting_azle voteToPoll '("Poll1", "user1", "option1")'
    assert_output --partial 'Err = "Voting is over.'
}

#bats test_tags=ok
@test "getAllPolls" {
    dfx identity use default
    run dfx canister call contribution_weighted_voting_azle getAllPolls
    assert_output --partial 'record {'
}

#bats test_tags=ok
@test "removeExpiredPolls 10" {
    dfx identity use default
    run dfx canister call contribution_weighted_voting_azle removeExpiredPolls 10
    assert_output --partial '(vec {})'
}

#bats test_tags=ok
@test "removeExpiredPolls 1" {
    dfx identity use default
    run dfx canister call contribution_weighted_voting_azle removeExpiredPolls 1
    assert_output --partial 'record {'
}

#bats test_tags=ok
@test "Press Ctrl-C to contine" {
    assert true
}
